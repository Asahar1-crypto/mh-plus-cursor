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
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    console.log('🔄 Starting backfill for missing recurring expenses...')

    // Get request body to determine which months to backfill
    const body = await req.json().catch(() => ({}))
    const targetAccountId = body.accountId as string | undefined
    const targetMonths = body.months as string[] | undefined // Format: ["2025-10", "2025-11"]

    console.log(`Target account: ${targetAccountId || 'all'}`)
    console.log(`Target months: ${targetMonths?.join(', ') || 'auto-detect'}`)

    // Get all accounts or specific account
    const accountsQuery = supabase
      .from('accounts')
      .select('id, billing_cycle_start_day')

    if (targetAccountId) {
      accountsQuery.eq('id', targetAccountId)
    }

    const { data: accounts, error: accountsError } = await accountsQuery

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError)
      throw accountsError
    }

    console.log(`👥 Found ${accounts?.length || 0} accounts`)

    let totalGenerated = 0
    const results: any[] = []

    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        console.log(`\n💳 Processing account ${account.id}`)

        const billingDay = account.billing_cycle_start_day || 1

        // Get all recurring expenses for this account
        const { data: recurringExpenses, error: fetchError } = await supabase
          .from('expenses')
          .select('*')
          .eq('account_id', account.id)
          .eq('is_recurring', true)
          .eq('frequency', 'monthly')

        if (fetchError) {
          console.error(`❌ Error fetching recurring expenses:`, fetchError)
          continue
        }

        console.log(`📊 Found ${recurringExpenses?.length || 0} recurring expenses`)

        let accountGenerated = 0

        if (recurringExpenses && recurringExpenses.length > 0) {
          // Determine which months to backfill
          let monthsToProcess: string[] = []

          if (targetMonths && targetMonths.length > 0) {
            monthsToProcess = targetMonths
          } else {
            // Auto-detect: October and November 2025
            monthsToProcess = ['2025-10', '2025-11']
          }

          for (const monthStr of monthsToProcess) {
            const [year, month] = monthStr.split('-').map(Number)
            
            console.log(`\n📅 Processing ${monthStr}`)

            // Calculate expense date for this month
            const lastDayOfMonth = new Date(year, month, 0).getDate()
            const effectiveBillingDay = Math.min(billingDay, lastDayOfMonth)
            const expenseDate = new Date(year, month - 1, effectiveBillingDay)
            const expenseDateStr = expenseDate.toISOString().split('T')[0]

            for (const expense of recurringExpenses) {
              // Check if expense should be active for this month
              if (expense.end_date) {
                const endDate = new Date(expense.end_date)
                if (expenseDate > endDate) {
                  console.log(`⏭️ Skipping ${expense.description} - ended before ${monthStr}`)
                  continue
                }
              }

              // Check if expense already exists for this month
              const cycleStart = new Date(year, month - 1, 1)
              const cycleEnd = new Date(year, month, 1)

              const { data: existingExpenses, error: checkError } = await supabase
                .from('expenses')
                .select('id')
                .eq('recurring_parent_id', expense.id)
                .gte('date', cycleStart.toISOString().split('T')[0])
                .lt('date', cycleEnd.toISOString().split('T')[0])

              if (checkError) {
                console.error(`❌ Error checking existing:`, checkError)
                continue
              }

              if (existingExpenses && existingExpenses.length > 0) {
                console.log(`⏭️ Already exists: ${expense.description} for ${monthStr}`)
                continue
              }

              // Create the expense
              const isAutoApproved = expense.paid_by_id === expense.created_by_id

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
                .select('id, description, amount, date')
                .single()

              if (insertError) {
                console.error(`❌ Error creating expense:`, insertError)
                continue
              }

              console.log(`✅ Created: ${newExpense?.description} (${newExpense?.amount} ₪) on ${newExpense?.date}`)
              accountGenerated++
              totalGenerated++
            }
          }
        }

        results.push({
          accountId: account.id,
          generated: accountGenerated
        })

        console.log(`✅ Account ${account.id}: Generated ${accountGenerated} expenses`)
      }
    }

    console.log(`\n🎉 Completed! Generated ${totalGenerated} total expenses`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfilled ${totalGenerated} recurring expenses`,
        totalGenerated,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in backfill function:', error)
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
