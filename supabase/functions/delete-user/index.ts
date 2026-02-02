import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  user_id: string;
  admin_promotions?: Record<string, string>; // account_id -> new_admin_user_id
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Verify authentication using anon client with user's token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Create anon client to validate user token
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      logStep("Auth error", { error: userError?.message });
      throw new Error(`Authentication failed: ${userError?.message || 'Unknown error'}`);
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Initialize service role client for admin operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify super admin permissions
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      throw new Error("Access denied: Super admin rights required");
    }

    logStep("Super admin verified");

    // Parse request body
    const requestBody = await req.json();
    const { user_id, admin_promotions }: DeleteUserRequest = requestBody;

    if (!user_id) {
      throw new Error("Missing required parameter: user_id");
    }

    // Get user details for validation and logging
    const { data: userToDelete, error: userFetchError } = await supabaseClient.auth.admin.getUserById(user_id);
    if (userFetchError || !userToDelete.user) {
      throw new Error("User not found in auth system");
    }

    logStep("User found in auth system", { 
      userId: user_id, 
      email: userToDelete.user.email 
    });

    // Get user profile info and accounts before deletion
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', user_id)
      .single();

    const { data: userAccounts } = await supabaseClient
      .from('accounts')
      .select('name')
      .eq('owner_id', user_id);

    // Start deletion process - delete in proper order to avoid foreign key constraints

    // 1. Delete from scanned_receipts
    logStep("Deleting scanned receipts");
    const { error: receiptsError } = await supabaseClient
      .from('scanned_receipts')
      .delete()
      .eq('user_id', user_id);
    
    if (receiptsError) {
      logStep("Error deleting scanned receipts", receiptsError);
      throw new Error(`Failed to delete scanned receipts: ${receiptsError.message}`);
    }

    // 2. Delete from invitations (where user was invited)
    logStep("Deleting invitations sent to user");
    const { error: invitationsError } = await supabaseClient
      .from('invitations')
      .delete()
      .eq('email', userToDelete.user.email);
    
    if (invitationsError) {
      logStep("Error deleting invitations", invitationsError);
      throw new Error(`Failed to delete invitations: ${invitationsError.message}`);
    }

    // 3. Delete from account_members AFTER checking admin roles
    logStep("Checking admin roles in accounts first");
    const { data: adminMemberships, error: adminError } = await supabaseClient
      .from('account_members')
      .select(`
        account_id,
        accounts!inner(name)
      `)
      .eq('user_id', user_id)
      .eq('role', 'admin');

    if (adminError) {
      logStep("Error checking admin memberships", adminError);
      throw new Error(`Failed to check admin memberships: ${adminError.message}`);
    }


    // Get detailed info about accounts where user is admin
    const accountsWhereAdmin = [];
    for (const membership of adminMemberships || []) {
      const { data: accountMembers, error: membersError } = await supabaseClient
        .from('account_members')
        .select(`
          user_id,
          role,
          profiles!inner(name)
        `)
        .eq('account_id', membership.account_id)
        .neq('user_id', user_id);

      if (membersError) {
        logStep("Error fetching account members", membersError);
        continue;
      }

      if (accountMembers && accountMembers.length > 0) {
        accountsWhereAdmin.push({
          account_id: membership.account_id,
          account_name: (membership.accounts as any).name,
          other_members: accountMembers.map((member: any) => ({
            user_id: member.user_id,
            name: member.profiles.name,
            role: member.role
          }))
        });
      }
    }

    // Check if we need to handle admin promotions

    // If user is admin in accounts with other members and no promotions provided, return info for UI
    if (accountsWhereAdmin.length > 0 && !admin_promotions) {
      logStep("User is admin in accounts with other members, returning info for confirmation");
      return new Response(
        JSON.stringify({
          success: false,
          requires_admin_promotion: true,
          admin_accounts: accountsWhereAdmin,
          message: "המשתמש הוא אדמין במשפחות עם חברים נוספים. יש לבחור מי יהפוך לאדמין במקומו."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Handle admin promotions if provided
    if (admin_promotions) {
      logStep("Processing admin promotions");
      for (const [accountId, newAdminId] of Object.entries(admin_promotions)) {
        if (newAdminId) {
          const { error: promoteError } = await supabaseClient
            .from('account_members')
            .update({ role: 'admin' })
            .eq('account_id', accountId)
            .eq('user_id', newAdminId);

          if (promoteError) {
            logStep("Error promoting new admin", promoteError);
            throw new Error(`Failed to promote new admin: ${promoteError.message}`);
          }

          logStep(`Promoted user ${newAdminId} to admin in account ${accountId}`);
        }
      }
    }

    // Now delete from account_members
    logStep("Deleting account memberships");
    const { error: membersError } = await supabaseClient
      .from('account_members')
      .delete()
      .eq('user_id', user_id);
    
    if (membersError) {
      logStep("Error deleting account memberships", membersError);
      throw new Error(`Failed to delete account memberships: ${membersError.message}`);
    }

    // Update ownership for owned accounts
    const { data: ownedAccounts } = await supabaseClient
      .from('accounts')
      .select('id, name')
      .eq('owner_id', user_id);

    for (const account of ownedAccounts || []) {
      const newOwnerId = admin_promotions?.[account.id] || null;
      
      const { error: transferError } = await supabaseClient
        .from('accounts')
        .update({ owner_id: newOwnerId })
        .eq('id', account.id);

      if (transferError) {
        logStep("Error transferring ownership", transferError);
        throw new Error(`Failed to transfer ownership: ${transferError.message}`);
      }

      logStep(`Transferred ownership of account ${account.name} to ${newOwnerId || 'null'}`);
    }

    // 4. Delete from profiles
    logStep("Deleting user profile");
    const { error: profileDeleteError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', user_id);
    
    if (profileDeleteError) {
      logStep("Error deleting profile", profileDeleteError);
      throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
    }

    // 5. Finally, delete from auth.users using admin API
    logStep("Deleting user from auth system");
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(user_id);
    
    if (authDeleteError) {
      logStep("Error deleting user from auth", authDeleteError);
      throw new Error(`Failed to delete user from auth: ${authDeleteError.message}`);
    }

    // 6. Record the deletion in deleted_users table
    logStep("Recording user deletion");
    const { error: recordError } = await supabaseClient
      .from('deleted_users')
      .insert({
        original_user_id: user_id,
        email: userToDelete.user.email,
        name: userProfile?.name || null,
        deleted_by: userData.user.id,
        accounts_deleted: userAccounts?.map(acc => acc.name) || []
      });

    if (recordError) {
      logStep("Warning: Failed to record deletion", recordError);
      // Don't fail the entire operation if recording fails
    }

    logStep("User deletion completed successfully", { 
      userId: user_id,
      email: userToDelete.user.email
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${userToDelete.user.email} deleted successfully`,
        user_id: user_id,
        email: userToDelete.user.email
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in delete-user", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});