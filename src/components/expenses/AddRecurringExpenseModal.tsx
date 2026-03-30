import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Child } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { Plus, Repeat, Users, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { supabase } from '@/integrations/supabase/client';

const addRecurringExpenseSchema = z.object({
  amount: z.number().min(0.01, 'הסכום חייב להיות גדול מ-0'),
  description: z.string().min(1, 'נדרש תיאור'),
  category: z.string().min(1, 'נדרש לבחור קטגוריה'),
  childId: z.string().optional(),
  paymentType: z.enum([
    'i_paid_shared', 
    'i_paid_theirs', 
    'they_paid_shared', 
    'they_paid_mine'
  ], {
    message: 'יש לבחור את סוג התשלום'
  }),
  frequency: z.enum(['monthly', 'weekly', 'yearly']),
  hasEndDate: z.boolean(),
  endDate: z.string().optional(),
  isIndexLinked: z.boolean().optional(),
  baseIndexPeriod: z.string().optional(),
  indexUpdateFrequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  floorEnabled: z.boolean().optional(),
}).refine(
  (data) => !data.isIndexLinked || (data.baseIndexPeriod && data.baseIndexPeriod.length >= 7),
  { message: 'נדרש לבחור חודש מדד בסיס', path: ['baseIndexPeriod'] }
);

type AddRecurringExpenseFormData = z.infer<typeof addRecurringExpenseSchema>;

interface AddRecurringExpenseModalProps {
  onSuccess: () => Promise<void>;
  childrenList: Child[];
}

export const AddRecurringExpenseModal: React.FC<AddRecurringExpenseModalProps> = ({
  onSuccess,
  childrenList
}) => {
  const { user, account } = useAuth();
  const indexLinkingAvailable = account?.index_linking_enabled === true;
  const { categoriesList } = useExpense();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });

  const form = useForm<AddRecurringExpenseFormData>({
    resolver: zodResolver(addRecurringExpenseSchema),
    defaultValues: {
      amount: 0,
      description: '',
      category: '',
      childId: '',
      paymentType: undefined,
      frequency: 'monthly',
      hasEndDate: false,
      endDate: '',
      isIndexLinked: false,
      baseIndexPeriod: '',
      indexUpdateFrequency: 'monthly',
      floorEnabled: true,
    },
  });

  const DEFAULT_CATEGORIES = ['חינוך', 'רפואה', 'פנאי', 'ביגוד', 'מזון', 'מזונות', 'קייטנות', 'אחר'];
  const categories = categoriesList.length > 0 ? categoriesList.map(c => c.name) : DEFAULT_CATEGORIES;

  const onSubmit = async (data: AddRecurringExpenseFormData) => {
    if (!user || !account) return;

    setIsSubmitting(true);

    try {
      // Determine paidById and expense settings based on payment type
      let paidById: string;
      let includeInMonthlyBalance = true;
      let splitEqually = false;
      
      const currentUserId = user?.id || '';
      const hasVirtualPartner = accountMembers?.length === 1 && !!account?.virtual_partner_name && !!account?.virtual_partner_id;
      const otherUserId = hasVirtualPartner
        ? account.virtual_partner_id!
        : accountMembers?.find(m => m.user_id !== currentUserId)?.user_id || '';
      
      switch (data.paymentType) {
        case 'i_paid_shared':
          paidById = otherUserId;
          splitEqually = true;
          break;
        case 'i_paid_theirs':
          paidById = otherUserId;
          splitEqually = false;
          break;
        case 'they_paid_shared':
          paidById = currentUserId;
          splitEqually = true;
          break;
        case 'they_paid_mine':
          paidById = currentUserId;
          splitEqually = false;
          break;
        default:
          paidById = currentUserId;
      }

      const isIndexLinked = indexLinkingAvailable && data.frequency === 'monthly' && data.isIndexLinked === true;
      // Auto-approve when account has a virtual partner (no real second member) or user paid for themselves
      const isVirtualPartnerAccount = hasVirtualPartner;
      const isAutoApproved = isVirtualPartnerAccount || paidById === user.id;
      const expenseData: any = {
        account_id: account.id,
        amount: isIndexLinked ? data.amount : data.amount,
        description: data.description,
        category: data.category,
        date: new Date().toISOString().split('T')[0],
        paid_by_id: paidById,
        created_by_id: user.id,
        split_equally: splitEqually,
        is_recurring: true,
        recurring_active: true,
        frequency: data.frequency,
        has_end_date: data.hasEndDate,
        end_date: data.hasEndDate ? data.endDate : null,
        status: isAutoApproved ? 'approved' : 'pending',
        approved_by: isAutoApproved ? user.id : null,
        approved_at: isAutoApproved ? new Date().toISOString() : null,
        include_in_monthly_balance: includeInMonthlyBalance,
        is_index_linked: isIndexLinked,
        base_amount: isIndexLinked ? data.amount : null,
        base_index_period: isIndexLinked ? data.baseIndexPeriod || null : null,
        index_update_frequency: isIndexLinked ? (data.indexUpdateFrequency || 'monthly') : null,
        floor_enabled: isIndexLinked ? (data.floorEnabled ?? true) : null,
      };

      const { data: insertedExpense, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select('id')
        .single();

      if (error) throw error;

      // Add child association if provided using expense_children table
      if (data.childId && data.childId !== 'none' && insertedExpense) {
        const { error: childError } = await supabase
          .from('expense_children')
          .insert({ expense_id: insertedExpense.id, child_id: data.childId });
        
        if (childError) {
          console.error('Error adding child association:', childError);
        }
      }

      toast.success('הוצאה חוזרת נוספה בהצלחה');
      await onSuccess();
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding recurring expense:', error);
      toast.error('שגיאה בהוספת ההוצאה החוזרת');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <Repeat className="h-4 w-4" />
          הוספת הוצאה חוזרת
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            הוספת הוצאה חוזרת חדשה
          </DialogTitle>
          <DialogDescription>
            צור הוצאה שתחזור על עצמה באופן אוטומטי לפי התדירות שתבחר
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
                      placeholder="תיאור ההוצאה החוזרת..."
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
                      <SelectItem value="none">כללי</SelectItem>
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
                const isVirtualPartnerMode = accountMembers?.length === 1 && !!account?.virtual_partner_name;
                const otherUserName = isVirtualPartnerMode
                  ? account.virtual_partner_name!
                  : accountMembers?.find(m => m.user_id !== user?.id)?.user_name || 'השותף/ה';

                const paymentOptions = [
                  {
                    value: 'i_paid_shared',
                    label: `אני שילמתי - יש לחלוק`,
                    description: `הסכום יחולק שווה בשווה ביני לבין ${otherUserName}`,
                    icon: <Users className="h-4 w-4" />,
                    color: 'text-blue-600 dark:text-blue-400'
                  },
                  {
                    value: 'i_paid_theirs',
                    label: `שילמתי - על ${otherUserName} להחזיר`,
                    description: `${otherUserName} צריך/ה להחזיר לי את מלוא הסכום`,
                    icon: <User className="h-4 w-4" />,
                    color: 'text-green-600 dark:text-green-400'
                  },
                  {
                    value: 'they_paid_shared',
                    label: `${otherUserName} שילם/ה - יש לחלוק`,
                    description: `הסכום יחולק שווה בשווה ביני לבין ${otherUserName}`,
                    icon: <Users className="h-4 w-4" />,
                    color: 'text-blue-600 dark:text-blue-400'
                  },
                  {
                    value: 'they_paid_mine',
                    label: `${otherUserName} שילם/ה - עליי להחזיר`,
                    description: `אני צריך/ה להחזיר ל${otherUserName} את מלוא הסכום`,
                    icon: <User className="h-4 w-4" />,
                    color: 'text-red-600 dark:text-red-400'
                  }
                ];

                return (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-semibold">מי ישלם ומי צריך לשלם?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-3"
                        dir="rtl"
                      >
                        {accountMembers && (accountMembers.length >= 2 || (accountMembers.length === 1 && !!account?.virtual_partner_name)) && paymentOptions.map((option) => (
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

            {indexLinkingAvailable && form.watch('frequency') === 'monthly' && (
              <>
                <FormField
                  control={form.control}
                  name="isIndexLinked"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>צמוד למדד המחירים לצרכן</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          הסכום יתעדכן אוטומטית לפי נתוני הלמ"ס
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
                {form.watch('isIndexLinked') && (
                  <>
                    <FormField
                      control={form.control}
                      name="baseIndexPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>חודש ושנת מדד הבסיס</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="בחר חודש (למשל: ינואר 2024)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(() => {
                                const opts: { value: string; label: string }[] = [];
                                const now = new Date();
                                for (let i = 0; i < 36; i++) {
                                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
                                  opts.push({ value: val, label: `${months[d.getMonth()]} ${d.getFullYear()}` });
                                }
                                return opts.map(o => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="indexUpdateFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>תדירות עדכון</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">חודשי</SelectItem>
                              <SelectItem value="quarterly">כל 3 חודשים</SelectItem>
                              <SelectItem value="yearly">שנתי</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="floorEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>רצפת מדד</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              הסכום לא יורד מתחת לסכום הבסיס
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}

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
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'מוסיף...' : 'הוסף הוצאה חוזרת'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};