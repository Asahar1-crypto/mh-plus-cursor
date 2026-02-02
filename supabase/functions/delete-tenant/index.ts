import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteTenantRequest {
  tenant_id: string;
  confirmation_name: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-TENANT] ${step}${detailsStr}`);
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
    const { tenant_id, confirmation_name }: DeleteTenantRequest = await req.json();

    if (!tenant_id || !confirmation_name) {
      throw new Error("Missing required parameters: tenant_id and confirmation_name");
    }

    // Get tenant details for validation
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('accounts')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant not found");
    }

    // Verify confirmation name matches
    if (tenant.name !== confirmation_name) {
      throw new Error("Confirmation name does not match tenant name");
    }

    logStep("Starting tenant deletion", { tenantId: tenant_id, tenantName: tenant.name });

    // Delete in proper order to avoid foreign key constraints
    
    // 1. Get all expenses for this tenant first
    const { data: expenses, error: expensesListError } = await supabaseClient
      .from('expenses')
      .select('id')
      .eq('account_id', tenant_id);

    if (expensesListError) {
      logStep("Error getting expenses list", expensesListError);
      throw new Error(`Failed to get expenses list: ${expensesListError.message}`);
    }

    // 2. Delete expense-children relationships
    if (expenses && expenses.length > 0) {
      logStep("Deleting expense-children relationships", { count: expenses.length });
      const expenseIds = expenses.map(e => e.id);
      const { error: expenseChildrenError } = await supabaseClient
        .from('expense_children')
        .delete()
        .in('expense_id', expenseIds);
      
      if (expenseChildrenError) {
        logStep("Error deleting expense-children", expenseChildrenError);
        throw new Error(`Failed to delete expense-children: ${expenseChildrenError.message}`);
      }
    } else {
      logStep("No expenses found, skipping expense-children deletion");
    }

    // 3. Delete expenses
    logStep("Deleting expenses");
    const { error: expensesError } = await supabaseClient
      .from('expenses')
      .delete()
      .eq('account_id', tenant_id);
    
    if (expensesError) {
      logStep("Error deleting expenses", expensesError);
      throw new Error(`Failed to delete expenses: ${expensesError.message}`);
    }

    // 4. Delete children
    logStep("Deleting children");
    const { error: childrenError } = await supabaseClient
      .from('children')
      .delete()
      .eq('account_id', tenant_id);
    
    if (childrenError) {
      logStep("Error deleting children", childrenError);
      throw new Error(`Failed to delete children: ${childrenError.message}`);
    }

    // 5. Delete budgets
    logStep("Deleting budgets");
    const { error: budgetsError } = await supabaseClient
      .from('budgets')
      .delete()
      .eq('account_id', tenant_id);
    
    if (budgetsError) {
      logStep("Error deleting budgets", budgetsError);
      throw new Error(`Failed to delete budgets: ${budgetsError.message}`);
    }

    // 6. Delete invitations
    logStep("Deleting invitations");
    const { error: invitationsError } = await supabaseClient
      .from('invitations')
      .delete()
      .eq('account_id', tenant_id);
    
    if (invitationsError) {
      logStep("Error deleting invitations", invitationsError);
      throw new Error(`Failed to delete invitations: ${invitationsError.message}`);
    }

    // 7. Delete account memberships
    logStep("Deleting account memberships");
    const { error: membersError } = await supabaseClient
      .from('account_members')
      .delete()
      .eq('account_id', tenant_id);
    
    if (membersError) {
      logStep("Error deleting account members", membersError);
      throw new Error(`Failed to delete account members: ${membersError.message}`);
    }

    // 8. Finally, delete the account itself
    logStep("Deleting account");
    const { error: accountError } = await supabaseClient
      .from('accounts')
      .delete()
      .eq('id', tenant_id);
    
    if (accountError) {
      logStep("Error deleting account", accountError);
      throw new Error(`Failed to delete account: ${accountError.message}`);
    }

    logStep("Tenant deletion completed successfully", { tenantId: tenant_id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Tenant ${tenant.name} deleted successfully`,
        tenant_id: tenant_id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in delete-tenant", { message: errorMessage });
    
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