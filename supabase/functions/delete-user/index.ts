import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  user_id: string;
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

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    logStep("User authenticated", { userId: userData.user.id });

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
    const { user_id }: DeleteUserRequest = await req.json();

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

    // 3. Delete from account_members
    logStep("Deleting account memberships");
    const { error: membersError } = await supabaseClient
      .from('account_members')
      .delete()
      .eq('user_id', user_id);
    
    if (membersError) {
      logStep("Error deleting account memberships", membersError);
      throw new Error(`Failed to delete account memberships: ${membersError.message}`);
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