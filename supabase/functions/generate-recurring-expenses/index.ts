import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          billing_cycle_start_day: number | null
        }
      }
      expenses: {
        Row: {
          id: string
          account_id: string
          amount: number
          description: string
          date: string
          category: string | null
          paid_by_id: string
          created_by_id: string | null
          status: string
          is_recurring: boolean | null
          frequency: string | null
          recurring_parent_id: string | null
          has_end_date: boolean | null
          end_date: string | null
          split_equally: boolean
          created_at: string
          updated_at: string
          recurring_auto_approved: boolean | null
          recurring_approved_by: string | null
          recurring_active: boolean | null
        }
        Insert: {
          id?: string
          account_id: string
          amount: number
          description: string
          date: string
          category?: string | null
          paid_by_id: string
          created_by_id?: string | null
          status?: string
          is_recurring?: boolean | null
          frequency?: string | null
          recurring_parent_id?: string | null
          has_end_date?: boolean | null
          end_date?: string | null
          split_equally?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          amount?: number
          description?: string
          date?: string
          category?: string | null
          paid_by_id?: string
          created_by_id?: string | null
          status?: string
          is_recurring?: boolean | null
          frequency?: string | null
          recurring_parent_id?: string | null
          has_end_date?: boolean | null
          end_date?: string | null
          split_equally?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    // 🔒 SECURITY: Dual authentication - either cron secret OR super-admin JWT
    const authHeader = req.headers.get('Authorization');
    const cronSecretHeader = req.headers.get('X-Cron-Secret');
    
    let isAuthorized = false;
    let authMethod = '';

    // Method 1: Cron secret (for scheduled jobs)
    if (cronSecretHeader && cronSecret && cronSecretHeader === cronSecret) {
      isAuthorized = true;
      authMethod = 'cron-secret';
      console.log('✅ Authenticated via cron secret');
    }
    // Method 2: Super-admin JWT (for manual calls)
    else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });

      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      const userId = claimsData?.claims?.sub;

      if (!claimsError && userId) {
        // Service role client to check super-admin
        const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('is_super_admin')
          .eq('id', userId)
          .single();

        if (profile?.is_super_admin) {
          isAuthorized = true;
          authMethod = 'super-admin';
          console.log('✅ Authenticated as super-admin:', userId);
        }
      }
    }

    if (!isAuthorized) {
      console.error('❌ Access denied: Requires cron secret or super-admin JWT');
      return new Response(
        JSON.stringify({ error: 'Access denied: Requires cron secret or super-admin rights' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`🔄 Starting recurring expenses generation (auth: ${authMethod})...`);

    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    // Get current date info
    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    console.log(`📅 Current date: ${currentDay}/${currentMonth}/${currentYear}`)

    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, billing_cycle_start_day')

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError)
      throw accountsError
    }

    console.log(`👥 Found ${accounts?.length || 0} accounts to process`)

    let totalGenerated = 0
    let totalSkipped = 0
    const processedAccounts: string[] = []
    const accountResults: Array<{accountId: string, generated: number, skipped: number}> = []

    // Process ALL accounts - not just those where today is billing day
    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        const billingDay = account.billing_cycle_start_day || 1
        
        // Calculate the expense date for this billing cycle
        // Handle months with fewer days (e.g., February)
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate()
        const actualBillingDay = Math.min(billingDay, lastDayOfMonth)
        
        const expenseDate = new Date(currentYear, currentMonth - 1, actualBillingDay)
        const expenseDateStr = expenseDate.toISOString().split('T')[0]

        console.log(`\n💳 Processing account ${account.id} (billing day: ${billingDay}, expense date: ${expenseDateStr})`)

        // Get all recurring expense templates for this account (parent templates only)
        const { data: recurringExpenses, error: fetchError } = await supabase
          .from('expenses')
          .select('*')
          .eq('account_id', account.id)
          .eq('is_recurring', true)
          .is('recurring_parent_id', null)
          .or(`end_date.is.null,end_date.gte.${now.toISOString().split('T')[0]}`)

        if (fetchError) {
          console.error(`❌ Error fetching recurring expenses for account ${account.id}:`, fetchError)
          continue
        }

        if (!recurringExpenses || recurringExpenses.length === 0) {
          console.log(`📊 No recurring expenses found for account ${account.id}`)
          continue
        }

        console.log(`📊 Found ${recurringExpenses.length} recurring expense templates for account ${account.id}`)

        let accountGenerated = 0
        let accountSkipped = 0

        for (const expense of recurringExpenses) {
          if (expense.recurring_active === false) {
            console.log(`⏭️ Skipping inactive recurring expense: ${expense.description}`)
            continue
          }
          if (expense.frequency !== 'monthly') {
            console.log(`⏭️ Skipping non-monthly expense: ${expense.description} (frequency: ${expense.frequency})`)
            continue
          }

          // Check if expense already exists for current month
          // Look for expenses with same recurring_parent_id in the current month
          const cycleStartDate = new Date(currentYear, currentMonth - 1, 1)
          const cycleEndDate = new Date(currentYear, currentMonth, 1)

          const { data: existingExpenses, error: checkError } = await supabase
            .from('expenses')
            .select('id, date, description')
            .eq('recurring_parent_id', expense.id)
            .gte('date', cycleStartDate.toISOString().split('T')[0])
            .lt('date', cycleEndDate.toISOString().split('T')[0])

          if (checkError) {
            console.error(`❌ Error checking existing expenses for ${expense.description}:`, checkError)
            continue
          }

          if (existingExpenses && existingExpenses.length > 0) {
            console.log(`⏭️ Expense already exists for ${currentMonth}/${currentYear}: ${expense.description}`)
            accountSkipped++
            totalSkipped++
            continue
          }

          // GENERATE the missing expense for current month
          console.log(`🆕 Creating missing expense for ${currentMonth}/${currentYear}: ${expense.description} (${expense.amount} ₪)`)

          // Auto-approve logic:
          // 1. If recurring_auto_approved is set on the template, use that approval
          // 2. Otherwise, auto-approve if the same user created and pays for the expense
          const isAutoApprovedByRecurring = expense.recurring_auto_approved && expense.recurring_approved_by
          const isAutoApprovedBySameUser = expense.paid_by_id === expense.created_by_id
          const isAutoApproved = isAutoApprovedByRecurring || isAutoApprovedBySameUser
          const approvedBy = isAutoApprovedByRecurring ? expense.recurring_approved_by : 
                            (isAutoApprovedBySameUser ? expense.created_by_id : null)
          
          const newExpenseData = {
            account_id: expense.account_id,
            amount: expense.amount,
            description: `${expense.description} (חודשי)`,
            date: expenseDateStr,
            category: expense.category,
            paid_by_id: expense.paid_by_id,
            created_by_id: expense.created_by_id,
            status: isAutoApproved ? 'approved' : 'pending',
            approved_by: approvedBy,
            approved_at: isAutoApproved ? new Date().toISOString() : null,
            split_equally: expense.split_equally,
            is_recurring: false,
            frequency: null,
            recurring_parent_id: expense.id,
            has_end_date: false,
            end_date: null
          }

          const { data: newExpense, error: insertError } = await supabase
            .from('expenses')
            .insert(newExpenseData)
            .select('id, description, amount')
            .single()

          if (insertError) {
            console.error(`❌ Error creating expense for ${expense.description}:`, insertError)
            continue
          }

          console.log(`✅ Generated: ${newExpense?.description} (${newExpense?.amount} ₪)`)
          accountGenerated++
          totalGenerated++
        }

        if (accountGenerated > 0) {
          processedAccounts.push(account.id)
        }

        accountResults.push({
          accountId: account.id,
          generated: accountGenerated,
          skipped: accountSkipped
        })

        console.log(`✅ Account ${account.id}: Generated ${accountGenerated}, Skipped ${accountSkipped} (already exist)`)
      }
    }

    const summary = {
      success: true,
      message: `Generated ${totalGenerated} recurring expenses across ${processedAccounts.length} accounts`,
      totalGenerated,
      totalSkipped,
      processedAccountsCount: processedAccounts.length,
      totalAccountsChecked: accounts?.length || 0,
      currentDate: {
        day: currentDay,
        month: currentMonth,
        year: currentYear
      },
      accountResults
    }

    console.log(`\n🎉 SUMMARY:`)
    console.log(`   - Total accounts checked: ${accounts?.length || 0}`)
    console.log(`   - Accounts with new expenses: ${processedAccounts.length}`)
    console.log(`   - Total expenses generated: ${totalGenerated}`)
    console.log(`   - Total expenses skipped (already exist): ${totalSkipped}`)

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in generate-recurring-expenses function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
