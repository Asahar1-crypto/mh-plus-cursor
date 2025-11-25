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
    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    console.log('🔄 Starting daily recurring expenses check...')

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

    console.log(`👥 Found ${accounts?.length || 0} accounts`)

    let totalGenerated = 0
    const processedAccounts: string[] = []

    // Process each account
    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        let billingDay = account.billing_cycle_start_day || 1
        
        // Handle months with fewer days (e.g., February)
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate()
        if (billingDay > lastDayOfMonth) {
          billingDay = lastDayOfMonth
        }

        // Check if today is the billing day for this account
        if (currentDay !== billingDay) {
          continue
        }

        console.log(`💳 Processing account ${account.id} (billing day: ${billingDay})`)

        // Calculate the expense date for this billing cycle
        const expenseDate = new Date(currentYear, currentMonth - 1, billingDay)
        const expenseDateStr = expenseDate.toISOString().split('T')[0]

        // Get all recurring expenses for this account
        const { data: recurringExpenses, error: fetchError } = await supabase
          .from('expenses')
          .select('*')
          .eq('account_id', account.id)
          .eq('is_recurring', true)
          .or(`end_date.is.null,end_date.gte.${now.toISOString().split('T')[0]}`)

        if (fetchError) {
          console.error(`❌ Error fetching recurring expenses for account ${account.id}:`, fetchError)
          continue
        }

        console.log(`📊 Found ${recurringExpenses?.length || 0} recurring expenses for account ${account.id}`)

        let accountGenerated = 0

        if (recurringExpenses && recurringExpenses.length > 0) {
          for (const expense of recurringExpenses) {
            if (expense.frequency !== 'monthly') {
              continue
            }

            console.log(`🔍 Processing expense: ${expense.description} (${expense.amount} ₪)`)

            // Check if expense already exists for this billing cycle
            // Look for expenses with same recurring_parent_id in the same month/year
            const cycleStartDate = new Date(currentYear, currentMonth - 1, 1)
            const cycleEndDate = new Date(currentYear, currentMonth, 1)

            const { data: existingExpenses, error: checkError } = await supabase
              .from('expenses')
              .select('id, date')
              .eq('recurring_parent_id', expense.id)
              .gte('date', cycleStartDate.toISOString().split('T')[0])
              .lt('date', cycleEndDate.toISOString().split('T')[0])

            if (checkError) {
              console.error(`❌ Error checking existing expenses for ${expense.id}:`, checkError)
              continue
            }

            if (existingExpenses && existingExpenses.length > 0) {
              console.log(`⏭️ Expense already exists for this billing cycle: ${expense.description}`)
              continue
            }

            // Generate new monthly expense
            // Auto-approve if the same user who created the recurring expense is also the one paying
            const isAutoApproved = expense.paid_by_id === expense.created_by_id;
            
            const newExpenseData = {
              account_id: expense.account_id,
              amount: expense.amount,
              description: `${expense.description} (חודשי)`,
              date: expenseDateStr,
              category: expense.category,
              paid_by_id: expense.paid_by_id,
              created_by_id: expense.created_by_id,
              status: isAutoApproved ? 'approved' : 'pending',
              approved_by: isAutoApproved ? expense.created_by_id : null,
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
              console.error(`❌ Error creating monthly expense for ${expense.description}:`, insertError)
              continue
            }

            console.log(`✅ Generated monthly expense: ${newExpense?.description} (${newExpense?.amount} ₪)`)
            accountGenerated++
            totalGenerated++
          }
        }

        if (accountGenerated > 0) {
          processedAccounts.push(account.id)
        }

        console.log(`✅ Account ${account.id}: Generated ${accountGenerated} expenses`)
      }
    }

    console.log(`🎉 Completed! Generated ${totalGenerated} expenses for ${processedAccounts.length} accounts`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${totalGenerated} recurring expenses for ${processedAccounts.length} accounts`,
        totalGenerated,
        processedAccountsCount: processedAccounts.length,
        currentDay,
        currentMonth,
        currentYear
      }),
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
