import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Expense, Child } from '@/contexts/expense/types';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';
import { supabase } from '@/integrations/supabase/client';

const editRecurringExpenseSchema = z.object({
  amount: z.number().min(0.01, 'הסכום חייב להיות גדול מ-0'),
  description: z.string().min(1, 'נדרש תיאור'),
  category: z.string().min(1, 'נדרש לבחור קטגוריה'),
  childId: z.string().optional(),
  paidById: z.string().min(1, 'נדרש לבחור מי משלם'),
  splitEqually: z.boolean(),
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
      paidById: '',
      splitEqually: false,
      frequency: 'monthly',
      hasEndDate: false,
      endDate: '',
    },
  });

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      form.reset({
        amount: expense.amount,
        description: expense.description,
        category: expense.category || '',
        childId: expense.childId || '',
        paidById: expense.paidById,
        splitEqually: expense.splitEqually,
        frequency: (expense.frequency as 'monthly' | 'weekly' | 'yearly') || 'monthly',
        hasEndDate: expense.hasEndDate || false,
        endDate: expense.endDate || '',
      });
    }
  }, [expense, form]);

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
      const updateData: any = {
        amount: data.amount,
        description: data.description,
        category: data.category,
        paid_by_id: data.paidById,
        split_equally: data.splitEqually,
        frequency: data.frequency,
        has_end_date: data.hasEndDate,
        end_date: data.hasEndDate ? data.endDate : null,
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
      <DialogContent className="sm:max-w-[500px]">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paidById"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מי משלם</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מי משלם" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountMembers?.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.user_name}
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
            </div>

            <FormField
              control={form.control}
              name="splitEqually"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>חלוקה שווה</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      האם לחלק את ההוצאה שווה בשווה בין בני הזוג
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