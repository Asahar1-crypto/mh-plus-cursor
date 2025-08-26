import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Expense, Child } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { Users, User, ArrowLeftRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { supabase } from '@/integrations/supabase/client';

const editRecurringExpenseSchema = z.object({
  amount: z.number().min(0.01, 'הסכום חייב להיות גדול מ-0'),
  description: z.string().min(1, 'נדרש תיאור'),
  category: z.string().min(1, 'נדרש לבחור קטגוריה'),
  childId: z.string().optional(),
  paymentType: z.enum([
    'i_paid_shared', 
    'i_paid_theirs', 
    'they_paid_shared', 
    'they_paid_mine', 
    'i_owe_them', 
    'they_owe_me'
  ], {
    message: 'יש לבחור את סוג התשלום'
  }),
  frequency: z.enum(['monthly', 'weekly', 'yearly']),
  hasEndDate: z.boolean(),
  endDate: z.string().optional(),
});

type EditRecurringExpenseFormData = z.infer<typeof editRecurringExpenseSchema>;

interface EditRecurringExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  childrenList: Child[];
}

export const EditRecurringExpenseModal: React.FC<EditRecurringExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onSuccess,
  childrenList
}) => {
  const { user, account } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  const form = useForm<EditRecurringExpenseFormData>({
    resolver: zodResolver(editRecurringExpenseSchema),
    defaultValues: {
      amount: 0,
      description: '',
      category: '',
      childId: '',
      paymentType: undefined,
      frequency: 'monthly',
      hasEndDate: false,
      endDate: '',
    },
  });

  // Convert existing expense data to payment type
  const getPaymentTypeFromExpense = (expense: Expense) => {
    if (!accountMembers) return undefined;
    
    const currentUser = accountMembers.find(m => m.role === 'admin')?.user_id || accountMembers[0]?.user_id || '';
    const isCurrentUserPaying = expense.paidById === currentUser;
    const isSplitEqually = expense.splitEqually;
    
    // Logic to determine payment type based on existing data
    if (isCurrentUserPaying && isSplitEqually) {
      return 'they_paid_shared'; // They paid, shared expense, I owe half
    } else if (isCurrentUserPaying && !isSplitEqually) {
      return 'they_paid_mine'; // They paid, my expense, I owe full
    } else if (!isCurrentUserPaying && isSplitEqually) {
      return 'i_paid_shared'; // I paid, shared expense, they owe half
    } else if (!isCurrentUserPaying && !isSplitEqually) {
      return 'i_paid_theirs'; // I paid, their expense, they owe full
    }
    
    return undefined;
  };

  // Reset form when expense changes
  useEffect(() => {
    if (expense && accountMembers) {
      const paymentType = getPaymentTypeFromExpense(expense);
      
      form.reset({
        amount: expense.amount,
        description: expense.description,
        category: expense.category || '',
        childId: expense.childId || '',
        paymentType: paymentType,
        frequency: (expense.frequency as 'monthly' | 'weekly' | 'yearly') || 'monthly',
        hasEndDate: expense.hasEndDate || false,
        endDate: expense.endDate || '',
      });
    }
  }, [expense, accountMembers, form]);

  const categories = [
    'חינוך',
    'רפואה', 
    'פנאי',
    'ביגוד',
    'מזון',
    'מזונות',
    'קייטנות',
    'אחר',
  ];

  const onSubmit = async (data: EditRecurringExpenseFormData) => {
    if (!user || !account || !expense) return;

    setIsSubmitting(true);

    try {
      // Determine paidById and expense settings based on payment type
      let paidById: string;
      let includeInMonthlyBalance = true;
      let splitEqually = false;
      
      const currentUser = accountMembers?.find(m => m.role === 'admin')?.user_id || accountMembers?.[0]?.user_id || '';
      const otherUser = accountMembers?.find(m => m.user_id !== currentUser)?.user_id || '';
      
      switch (data.paymentType) {
        case 'i_paid_shared':
          paidById = otherUser;
          splitEqually = true;
          break;
        case 'i_paid_theirs':
          paidById = otherUser;
          splitEqually = false;
          break;
        case 'they_paid_shared':
          paidById = currentUser;
          splitEqually = true;
          break;
        case 'they_paid_mine':
          paidById = currentUser;
          splitEqually = false;
          break;
        case 'i_owe_them':
          paidById = currentUser;
          splitEqually = false;
          break;
        case 'they_owe_me':
          paidById = otherUser;
          splitEqually = false;
          break;
        default:
          paidById = currentUser;
      }

      const updateData: any = {
        amount: data.amount,
        description: data.description,
        category: data.category,
        paid_by_id: paidById,
        split_equally: splitEqually,
        frequency: data.frequency,
        has_end_date: data.hasEndDate,
        end_date: data.hasEndDate ? data.endDate : null,
        include_in_monthly_balance: includeInMonthlyBalance,
        updated_at: new Date().toISOString(),
      };

      // Update child association if provided
      if (data.childId) {
        updateData.child_id = data.childId;
      }

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expense.id)
        .eq('account_id', account.id);

      if (error) throw error;

      toast.success('הוצאה חוזרת עודכנה בהצלחה');
      await onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      toast.error('שגיאה בעדכון ההוצאה החוזרת');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת הוצאה חוזרת</DialogTitle>
          <DialogDescription>
            עדכן את פרטי ההוצאה החוזרת. השינויים יחולו על ההוצאות החדשות שייווצרו בעתיד.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סכום (₪)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>קטגוריה</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תיאור</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="תיאור ההוצאה..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="childId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שיוך לילד (אופציונלי)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר ילד (אופציונלי)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">ללא שיוך לילד</SelectItem>
                      {childrenList.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => {
                const currentUserName = accountMembers?.find(m => m.role === 'admin')?.user_name || 'אני';
                const otherUserName = accountMembers?.find(m => m.user_id !== (accountMembers?.find(m => m.role === 'admin')?.user_id || accountMembers?.[0]?.user_id))?.user_name || 'השותף';
                
                const paymentOptions = [
                  {
                    value: 'i_paid_shared',
                    label: `אני אשלם - הוצאה משותפת`,
                    description: `${otherUserName} יחזיר לי חצי מהסכום`,
                    icon: <Users className="h-4 w-4" />,
                    color: 'text-blue-600 dark:text-blue-400'
                  },
                  {
                    value: 'i_paid_theirs',
                    label: `אני אשלם - הוצאה של ${otherUserName}`,
                    description: `${otherUserName} יחזיר לי את מלוא הסכום`,
                    icon: <User className="h-4 w-4" />,
                    color: 'text-green-600 dark:text-green-400'
                  },
                  {
                    value: 'they_paid_shared',
                    label: `${otherUserName} ישלם - הוצאה משותפת`,
                    description: `אני אחזיר ל${otherUserName} חצי מהסכום`,
                    icon: <Users className="h-4 w-4" />,
                    color: 'text-blue-600 dark:text-blue-400'
                  },
                  {
                    value: 'they_paid_mine',
                    label: `${otherUserName} ישלם - הוצאה שלי`,
                    description: `אני אחזיר ל${otherUserName} את מלוא הסכום`,
                    icon: <User className="h-4 w-4" />,
                    color: 'text-red-600 dark:text-red-400'
                  },
                  {
                    value: 'i_owe_them',
                    label: `אני צריך לשלם ל${otherUserName}`,
                    description: 'חוב ללא תשלום מוקדם (כמו מזונות, דמי ילדים)',
                    icon: <ArrowLeftRight className="h-4 w-4" />,
                    color: 'text-orange-600 dark:text-orange-400'
                  },
                  {
                    value: 'they_owe_me',
                    label: `${otherUserName} צריך לשלם לי`,
                    description: 'חוב ללא תשלום מוקדם (כמו מזונות, השתתפות)',
                    icon: <ArrowLeftRight className="h-4 w-4" />,
                    color: 'text-purple-600 dark:text-purple-400'
                  }
                ];

                return (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-semibold">מי ישלם ומי צריך לשלם?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-3"
                        dir="rtl"
                      >
                        {accountMembers && accountMembers.length >= 2 && paymentOptions.map((option) => (
                          <div 
                            key={option.value}
                            className="flex items-start space-x-3 space-x-reverse rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                          >
                            <RadioGroupItem 
                              value={option.value} 
                              id={option.value}
                              className="mt-1" 
                            />
                            <div className="flex-1 space-y-1">
                              <label 
                                htmlFor={option.value} 
                                className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                              >
                                <span className={option.color}>
                                  {option.icon}
                                </span>
                                {option.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      בחר את המצב המתאים להוצאה חוזרת זו
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תדירות</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תדירות" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">חודשי</SelectItem>
                      <SelectItem value="weekly">שבועי</SelectItem>
                      <SelectItem value="yearly">שנתי</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>תאריך סיום</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      האם להגדיר תאריך סיום להוצאה החוזרת
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('hasEndDate') && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תאריך סיום</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                ביטול
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'מעדכן...' : 'עדכן הוצאה'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};