
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
import { Calendar as CalendarIcon, DollarSign, Users, User } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useExpense } from '@/contexts/ExpenseContext';
import { ExpenseFormValues, expenseSchema } from './expenseFormSchema';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { checkBudgetBeforeExpense, type BudgetCheckResult } from '@/utils/budgetCheckService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExpenseFormProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

const DEFAULT_CATEGORIES = ['חינוך', 'רפואה', 'פנאי', 'ביגוד', 'מזון', 'מזונות', 'קייטנות', 'אחר'];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmitSuccess, onCancel }) => {
  const { addExpense, childrenList, categoriesList } = useExpense();
  const categories = categoriesList.length > 0 ? categoriesList.map(c => c.name) : DEFAULT_CATEGORIES;
  const { user, account } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = React.useState(false);
  const [budgetAlert, setBudgetAlert] = React.useState<{
    open: boolean;
    result: BudgetCheckResult;
    payload: Parameters<typeof addExpense>[0];
  } | null>(null);

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
      
      // Use the actual logged-in user's ID, not the admin
      const currentUserId = user?.id || '';
      const otherUserId = accountMembers?.find(m => m.user_id !== currentUserId)?.user_id || '';
      
      switch (data.paymentType) {
        case 'i_paid_shared':
          // אני שילמתי - יש לחלוק (חצי חצי)
          paidById = otherUserId; // The other user owes me half
          splitEqually = true;
          includeInMonthlyBalance = true;
          break;
        case 'i_paid_theirs':
          // שילמתי - על השותף להחזיר (החזר מלא)
          paidById = otherUserId; // The other user owes me full amount
          splitEqually = false;
          includeInMonthlyBalance = true;
          break;
        case 'they_paid_shared':
          // השותף שילם - יש לחלוק (חצי חצי)
          paidById = currentUserId; // I owe them half
          splitEqually = true;
          includeInMonthlyBalance = true;
          break;
        case 'they_paid_mine':
          // השותף שילם - עליי להחזיר (החזר מלא)
          paidById = currentUserId; // I owe them full amount
          splitEqually = false;
          includeInMonthlyBalance = true;
          break;
        default:
          paidById = currentUserId;
      }
      
      const paidByMember = accountMembers?.find(m => m.user_id === paidById);
      const payload = {
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
      };

      if (account?.id) {
        try {
          const checkResult = await checkBudgetBeforeExpense(
            account.id,
            data.category,
            payload.amount,
            payload.date
          );
          if (checkResult.status === 'warning_90' || checkResult.status === 'exceeded') {
            setBudgetAlert({ open: true, result: checkResult, payload });
            setIsPending(false);
            return;
          }
        } catch {
          // Budget check failed - proceed with add
        }
      }

      await addExpense(payload);
      
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

  const handleBudgetAlertConfirm = async () => {
    if (!budgetAlert) return;
    setIsPending(true);
    setBudgetAlert(null);
    try {
      await addExpense(budgetAlert.payload);
      if (onSubmitSuccess) onSubmitSuccess();
      else navigate('/expenses');
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div dir="rtl" className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                          "w-full pr-3 text-right font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>בחר תאריך</span>
                        )}
                        <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
            // Get the other user's name based on the actual logged-in user
            const otherUserName = accountMembers?.find(m => m.user_id !== user?.id)?.user_name || 'השותף/ה';
            
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
              <FormItem className="space-y-3 sm:space-y-4">
                <FormLabel className="text-base sm:text-lg font-semibold">מי שילם ומי צריך לשלם?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="space-y-2 sm:space-y-3"
                    dir="rtl"
                  >
                    {accountMembers && accountMembers.length >= 2 && paymentOptions.map((option) => (
                      <div 
                        key={option.value}
                        className="flex items-start space-x-3 space-x-reverse rounded-lg border p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem 
                          value={option.value} 
                          id={option.value}
                          className="mt-1" 
                        />
                        <div className="flex-1 space-y-1">
                          <label 
                            htmlFor={option.value} 
                            className="flex items-center gap-2 text-xs sm:text-sm font-medium leading-none cursor-pointer"
                          >
                            <span className={option.color}>
                              {option.icon}
                            </span>
                            {option.label}
                          </label>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm sm:text-base">הוצאה קבועה</FormLabel>
                <FormDescription className="text-xs sm:text-sm">
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm sm:text-base">הגדר תאריך סיום</FormLabel>
                    <FormDescription className="text-xs sm:text-sm">
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
                              "w-full pr-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>בחר תאריך סיום</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
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

        
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full sm:w-auto"
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
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
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

    <AlertDialog open={!!budgetAlert} onOpenChange={(open) => !open && setBudgetAlert(null)}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className={budgetAlert?.result.status === 'exceeded' ? 'text-destructive' : 'text-amber-600'}>
            {budgetAlert?.result.status === 'exceeded' ? 'חרגת מהתקציב' : 'התקציב הגיע ל-90%'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {budgetAlert && (
              <>
                קטגוריה &quot;{budgetAlert.payload.category}&quot;: התקציב ₪{budgetAlert.result.budget.toFixed(0)},
                הוצא עד כה ₪{budgetAlert.result.spent.toFixed(0)}. עם הוספת הוצאה זו: ₪{budgetAlert.result.newSpent.toFixed(0)}.
                האם להמשיך בכל זאת?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={handleBudgetAlertConfirm}>
            המשך בכל זאת
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
};
