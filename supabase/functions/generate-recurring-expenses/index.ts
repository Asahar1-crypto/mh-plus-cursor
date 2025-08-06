import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
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

    console.log('🔄 Starting recurring expenses generation...')

    // Get current date info
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
    const currentYear = now.getFullYear()
    const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0]
    
    console.log(`📅 Processing for month: ${currentMonth}/${currentYear}`)

    // Get all recurring expenses that should generate instances
    const { data: recurringExpenses, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('is_recurring', true)
      .or(`end_date.is.null,end_date.gte.${now.toISOString().split('T')[0]}`)

    if (fetchError) {
      console.error('❌ Error fetching recurring expenses:', fetchError)
      throw fetchError
    }

    console.log(`📊 Found ${recurringExpenses?.length || 0} recurring expenses`)

    let generatedCount = 0

    if (recurringExpenses && recurringExpenses.length > 0) {
      for (const expense of recurringExpenses) {
        console.log(`🔍 Processing expense: ${expense.description} (${expense.amount} ₪)`)
        
        if (expense.frequency === 'monthly') {
          // Check if expense already exists for current month
          const { data: existingExpenses, error: checkError } = await supabase
            .from('expenses')
            .select('id')
            .eq('recurring_parent_id', expense.id)
            .gte('date', firstDayOfMonth)
            .lt('date', new Date(currentYear, now.getMonth() + 1, 1).toISOString().split('T')[0])

          if (checkError) {
            console.error(`❌ Error checking existing expenses for ${expense.id}:`, checkError)
            continue
          }

          if (existingExpenses && existingExpenses.length > 0) {
            console.log(`⏭️ Expense already exists for this month: ${expense.description}`)
            continue
          }

          // Generate new monthly expense
          // Auto-approve if the same user who created the recurring expense is also the one paying
          const isAutoApproved = expense.paid_by_id === expense.created_by_id;
          
          const newExpenseData = {
            account_id: expense.account_id,
            amount: expense.amount,
            description: `${expense.description} (חודשי)`,
            date: firstDayOfMonth,
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
          generatedCount++
        }
      }
    }

    console.log(`🎉 Completed! Generated ${generatedCount} new monthly expenses`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${generatedCount} recurring expenses for ${currentMonth}/${currentYear}`,
        generatedCount,
        month: currentMonth,
        year: currentYear
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