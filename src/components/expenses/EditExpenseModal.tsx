import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useExpense } from '@/contexts/ExpenseContext';

const DEFAULT_CATEGORIES = ['חינוך', 'רפואה', 'פנאי', 'ביגוד', 'מזון', 'מזונות', 'קייטנות', 'אחר'];
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { Expense } from '@/contexts/expense/types';
import { Calendar as CalendarIcon } from 'lucide-react';

const editExpenseSchema = z.object({
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, { message: 'הסכום חייב להיות מספר חיובי' }),
  description: z.string().min(2, { message: 'נדרש תיאור של לפחות 2 תווים' }),
  category: z.string().min(1, { message: 'יש לבחור קטגוריה' }),
  childId: z.string().optional(),
  date: z.date(),
  paidById: z.string().optional(),
  splitEqually: z.boolean().default(false),
});

type EditExpenseFormValues = z.infer<typeof editExpenseSchema>;

interface EditExpenseModalProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, open, onOpenChange, onSuccess }) => {
  const { updateExpense, childrenList, categoriesList } = useExpense();
  const categories = categoriesList.length > 0 ? categoriesList.map(c => c.name) : DEFAULT_CATEGORIES;
  const { user, account } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const { data: accountMembers } = useQuery({
    queryKey: ['accountMembers', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id && open
  });

  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(editExpenseSchema),
    defaultValues: {
      amount: '',
      description: '',
      category: '',
      childId: '',
      date: new Date(),
      paidById: '',
      splitEqually: false,
    }
  });

  useEffect(() => {
    if (expense && open) {
      form.reset({
        amount: expense.amount.toString(),
        description: expense.description,
        category: expense.category || 'אחר',
        childId: expense.childId || 'general',
        date: new Date(expense.date),
        paidById: expense.paidById,
        splitEqually: expense.splitEqually,
      });
    }
  }, [expense, open, form]);

  const onSubmit = async (data: EditExpenseFormValues) => {
    if (!expense) return;
    setIsPending(true);
    try {
      const updates: Parameters<typeof updateExpense>[1] = {
        amount: Number(data.amount),
        description: data.description,
        category: data.category,
        date: format(data.date, 'yyyy-MM-dd'),
        childId: data.childId === 'general' ? undefined : data.childId,
      };
      if (!isPersonalPlan) {
        updates.paidById = data.paidById && data.paidById !== '' ? data.paidById : expense.paidById;
        updates.splitEqually = data.splitEqually;
      }
      await updateExpense(expense.id, updates);
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsPending(false);
    }
  };

  const isPersonalPlan = account?.plan_slug === 'personal';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת הוצאה</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תיאור</FormLabel>
                  <FormControl>
                    <Textarea placeholder="תיאור ההוצאה..." className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תאריך</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "dd/MM/yyyy") : "בחר תאריך"}
                          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
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
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="כללי" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">כללי</SelectItem>
                      {childrenList.map((child) => (
                        <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {!isPersonalPlan && accountMembers && accountMembers.length > 1 && (
              <>
                <FormField
                  control={form.control}
                  name="paidById"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>משלם</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר משלם" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountMembers.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>{m.user_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="splitEqually"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <FormLabel>חלוקה שווה</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
