import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddMemberRequest {
  tenant_id: string;
  user_email: string;
  role?: 'admin' | 'member';
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADD-TENANT-MEMBER] ${step}${detailsStr}`);
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
    const { tenant_id, user_email, role = 'member' }: AddMemberRequest = await req.json();

    if (!tenant_id || !user_email) {
      throw new Error("Missing required parameters: tenant_id and user_email");
    }

    // Validate tenant exists
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('accounts')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant not found");
    }

    logStep("Tenant found", { tenantId: tenant_id, tenantName: tenant.name });

    // Find user by email in auth.users
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to search users: ${authError.message}`);
    }

    const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === user_email.toLowerCase());
    
    if (!targetUser) {
      throw new Error(`User with email ${user_email} not found in the system`);
    }

    logStep("Target user found", { userId: targetUser.id, email: targetUser.email });

    // Check if user profile exists
    const { data: userProfile, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('id, name')
      .eq('id', targetUser.id)
      .single();

    if (profileCheckError) {
      // Create profile if it doesn't exist
      logStep("Creating user profile");
      const { error: createProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: targetUser.id,
          name: targetUser.user_metadata?.name || targetUser.email?.split('@')[0] || 'User'
        });

      if (createProfileError) {
        throw new Error(`Failed to create user profile: ${createProfileError.message}`);
      }
    }

    // Check if user is already a member of this account
    const { data: existingMember, error: memberCheckError } = await supabaseClient
      .from('account_members')
      .select('user_id, role')
      .eq('account_id', tenant_id)
      .eq('user_id', targetUser.id)
      .single();

    if (!memberCheckError && existingMember) {
      throw new Error(`User ${user_email} is already a member of this family (role: ${existingMember.role})`);
    }

    // Add the user to the account
    logStep("Adding user to account", { role });
    const { error: addMemberError } = await supabaseClient
      .from('account_members')
      .insert({
        account_id: tenant_id,
        user_id: targetUser.id,
        role: role
      });

    if (addMemberError) {
      logStep("Error adding member", addMemberError);
      throw new Error(`Failed to add member: ${addMemberError.message}`);
    }

    logStep("Member added successfully", { 
      tenantId: tenant_id, 
      userId: targetUser.id,
      email: user_email,
      role: role,
      tenantName: tenant.name
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${user_email} added to ${tenant.name} successfully as ${role}`,
        tenant_id: tenant_id,
        user_id: targetUser.id,
        user_email: user_email,
        role: role
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in add-tenant-member", { message: errorMessage });
    
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