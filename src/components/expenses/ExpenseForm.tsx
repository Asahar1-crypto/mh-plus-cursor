
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Users, User, ArrowLeftRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useExpense } from '@/contexts/ExpenseContext';
import { ExpenseFormValues, expenseSchema } from './expenseFormSchema';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface ExpenseFormProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmitSuccess, onCancel }) => {
  const { addExpense, childrenList } = useExpense();
  const { account } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = React.useState(false);

  // Load account members for the payer selection
  const { data: accountMembers } = useQuery({
    queryKey: ['accountMembers', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      return memberService.getAccountMembers(account.id);
    },
    enabled: !!account?.id
  });
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: '',
      description: '',
      category: '',
      childId: '',
      paymentType: undefined,
      isRecurring: false,
      frequency: 'monthly',
      hasEndDate: false,
      endDate: undefined,
      includeInMonthlyBalance: true,
      splitEqually: false,
      date: new Date(),
      receipt: '',
    },
  });
  
  const watchIsRecurring = form.watch('isRecurring');
  const watchHasEndDate = form.watch('hasEndDate');
  
  const onSubmit = async (data: ExpenseFormValues) => {
    setIsPending(true);
    try {
      const childInfo = data.childId ? 
        childrenList.find(c => c.id === data.childId) : undefined;
      
      // Determine paidById and expense settings based on payment type
      let paidById: string;
      let includeInMonthlyBalance = true;
      let splitEqually = false;
      
      const currentUser = accountMembers?.find(m => m.role === 'admin')?.user_id || accountMembers?.[0]?.user_id || '';
      const otherUser = accountMembers?.find(m => m.user_id !== currentUser)?.user_id || '';
      
      switch (data.paymentType) {
        case 'i_paid_shared':
          // אני שילמתי - הוצאה משותפת (חצי החזר)
          paidById = otherUser; // They owe me half
          splitEqually = true;
          includeInMonthlyBalance = true;
          break;
        case 'i_paid_theirs':
          // אני שילמתי - הוצאה של נטלי (החזר מלא)
          paidById = otherUser; // They owe me full amount
          splitEqually = false;
          includeInMonthlyBalance = true;
          break;
        case 'they_paid_shared':
          // נטלי שילמה - הוצאה משותפת (חצי החזר)
          paidById = currentUser; // I owe them half
          splitEqually = true;
          includeInMonthlyBalance = true;
          break;
        case 'they_paid_mine':
          // נטלי שילמה - הוצאה שלי (החזר מלא)
          paidById = currentUser; // I owe them full amount
          splitEqually = false;
          includeInMonthlyBalance = true;
          break;
        case 'i_owe_them':
          // אני צריך לשלם לנטלי (ללא תשלום מוקדם)
          paidById = currentUser; // I owe them
          splitEqually = false;
          includeInMonthlyBalance = true;
          break;
        case 'they_owe_me':
          // נטלי צריכה לשלם לי (ללא תשלום מוקדם)
          paidById = otherUser; // They owe me
          splitEqually = false;
          includeInMonthlyBalance = true;
          break;
        default:
          paidById = currentUser;
      }
      
      const paidByMember = accountMembers?.find(m => m.user_id === paidById);
      
      await addExpense({
        amount: Number(data.amount),
        description: data.description,
        category: data.category,
        date: format(data.date, 'yyyy-MM-dd'),
        childId: data.childId === 'general' ? undefined : data.childId,
        childName: childInfo?.name,
        paidById: paidById,
        paidByName: paidByMember?.user_name || '',
        isRecurring: data.isRecurring,
        frequency: data.isRecurring ? data.frequency as 'monthly' | 'weekly' | 'yearly' : undefined,
        hasEndDate: data.hasEndDate,
        endDate: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : undefined,
        includeInMonthlyBalance: includeInMonthlyBalance,
        splitEqually: splitEqually,
        receipt: data.receipt,
      });
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        navigate('/expenses');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsPending(false);
    }
  };
  
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
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>תאריך</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>בחר תאריך</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10001]" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>סכום (₪)</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" {...field} />
                </FormControl>
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
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>קטגוריה</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[10001]">
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

          <FormField
            control={form.control}
            name="childId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>שיוך לילד/ה</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר ילד/ה (אופציונלי)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="general">כללי - ללא שיוך לילד/ה</SelectItem>
                    {childrenList.length > 0 ? (
                      childrenList.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-children" disabled>
                        אין ילדים במערכת
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  שיוך ההוצאה לילד ספציפי (אופציונלי)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="paymentType"
          render={({ field }) => {
            const currentUserName = accountMembers?.find(m => m.role === 'admin')?.user_name || 'אני';
            const otherUserName = accountMembers?.find(m => m.user_id !== (accountMembers?.find(m => m.role === 'admin')?.user_id || accountMembers?.[0]?.user_id))?.user_name || 'השותף';
            
            const paymentOptions = [
              {
                value: 'i_paid_shared',
                label: `אני שילמתי - הוצאה משותפת`,
                description: `${otherUserName} יחזיר לי חצי מהסכום`,
                icon: <Users className="h-4 w-4" />,
                color: 'text-blue-600 dark:text-blue-400'
              },
              {
                value: 'i_paid_theirs',
                label: `אני שילמתי - הוצאה של ${otherUserName}`,
                description: `${otherUserName} יחזיר לי את מלוא הסכום`,
                icon: <User className="h-4 w-4" />,
                color: 'text-green-600 dark:text-green-400'
              },
              {
                value: 'they_paid_shared',
                label: `${otherUserName} שילם/ה - הוצאה משותפת`,
                description: `אני אחזיר ל${otherUserName} חצי מהסכום`,
                icon: <Users className="h-4 w-4" />,
                color: 'text-blue-600 dark:text-blue-400'
              },
              {
                value: 'they_paid_mine',
                label: `${otherUserName} שילם/ה - הוצאה שלי`,
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
                label: `${otherUserName} צריך/צריכה לשלם לי`,
                description: 'חוב ללא תשלום מוקדם (כמו מזונות, השתתפות)',
                icon: <ArrowLeftRight className="h-4 w-4" />,
                color: 'text-purple-600 dark:text-purple-400'
              }
            ];

            return (
              <FormItem className="space-y-4">
                <FormLabel className="text-lg font-semibold">מי שילם ומי צריך לשלם?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="space-y-3"
                    dir="rtl"
                  >
                    {accountMembers && accountMembers.length >= 2 && paymentOptions.map((option) => (
                      <div 
                        key={option.value}
                        className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 hover:bg-muted/50 transition-colors"
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
                  בחר את המצב המתאים - מי שילם בפועל ואיך לחלק את ההוצאה
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">הוצאה קבועה</FormLabel>
                <FormDescription>
                  סמן אם זו הוצאה חוזרת (למשל: חוג, שיעור פרטי)
                </FormDescription>
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
        
        {watchIsRecurring && (
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>תדירות</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תדירות" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="monthly">חודשי</SelectItem>
                    <SelectItem value="yearly">שנתי</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchIsRecurring && (
          <>
            <FormField
              control={form.control}
              name="hasEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">הגדר תאריך סיום</FormLabel>
                    <FormDescription>
                      סמן אם ברצונך להגדיר תאריך סיום להוצאה הקבועה
                    </FormDescription>
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

            {watchHasEndDate && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>תאריך סיום</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>בחר תאריך סיום</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[10001]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      תאריך שבו ההוצאה הקבועה תפסיק להתווסף אוטומטית
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                navigate('/expenses');
              }
            }}
          >
            ביטול
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                שומר...
              </span>
            ) : (
              'הוסף הוצאה'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
