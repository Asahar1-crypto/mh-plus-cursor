import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RemoveMemberRequest {
  tenant_id: string;
  user_id: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REMOVE-TENANT-MEMBER] ${step}${detailsStr}`);
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
    const { tenant_id, user_id }: RemoveMemberRequest = await req.json();

    if (!tenant_id || !user_id) {
      throw new Error("Missing required parameters: tenant_id and user_id");
    }

    // Get member details for validation
    const { data: member, error: memberError } = await supabaseClient
      .from('account_members')
      .select(`
        user_id,
        role,
        profiles!account_members_user_id_fkey(name)
      `)
      .eq('account_id', tenant_id)
      .eq('user_id', user_id)
      .single();

    if (memberError || !member) {
      throw new Error("Member not found in this tenant");
    }

    logStep("Member found", { 
      userId: user_id, 
      role: member.role, 
      name: (member as any).profiles?.name 
    });

    // Check if this is the last admin - warn but allow super admin to proceed
    let isLastAdmin = false;
    if (member.role === 'admin') {
      const { data: adminCount, error: adminCountError } = await supabaseClient
        .from('account_members')
        .select('user_id', { count: 'exact' })
        .eq('account_id', tenant_id)
        .eq('role', 'admin');

      if (adminCountError) {
        throw new Error("Failed to check admin count");
      }

      isLastAdmin = (adminCount?.length || 0) <= 1;
      
      if (isLastAdmin) {
        logStep("Warning: Removing last admin from tenant", { tenantId: tenant_id });
      }
    }

    // Get tenant name for response
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('accounts')
      .select('name')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      throw new Error("Tenant not found");
    }

    // Remove the member from the account
    logStep("Removing member from account");
    const { error: removeError } = await supabaseClient
      .from('account_members')
      .delete()
      .eq('account_id', tenant_id)
      .eq('user_id', user_id);

    if (removeError) {
      logStep("Error removing member", removeError);
      throw new Error(`Failed to remove member: ${removeError.message}`);
    }

    logStep("Member removed successfully", { 
      tenantId: tenant_id, 
      userId: user_id,
      tenantName: tenant.name
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Member removed from ${tenant.name} successfully`,
        tenant_id: tenant_id,
        user_id: user_id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in remove-tenant-member", { message: errorMessage });
    
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