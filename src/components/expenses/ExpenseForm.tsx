
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Child, useExpense } from '@/contexts/ExpenseContext';
import { ExpenseFormValues, expenseSchema } from './expenseFormSchema';

interface ExpenseFormProps {
  onSubmitSuccess?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmitSuccess }) => {
  const { addExpense, childrenList } = useExpense();
  const navigate = useNavigate();
  const [isPending, setIsPending] = React.useState(false);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: '',
      description: '',
      category: '',
      childId: '',
      isRecurring: false,
      frequency: 'monthly',
    },
  });
  
  const watchIsRecurring = form.watch('isRecurring');
  
  const onSubmit = async (data: ExpenseFormValues) => {
    setIsPending(true);
    try {
      const childInfo = data.childId ? 
        childrenList.find(c => c.id === data.childId) : undefined;
      
      await addExpense({
        amount: Number(data.amount),
        description: data.description,
        category: data.category,
        date: format(new Date(), 'yyyy-MM-dd'),
        childId: data.childId,
        childName: childInfo?.name,
        isRecurring: data.isRecurring,
        frequency: data.isRecurring ? data.frequency as 'monthly' | 'weekly' | 'yearly' : undefined,
      });
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        navigate('/dashboard');
      }
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
    'אחר',
  ];
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="min-h-[80px]"
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
              <FormLabel>ילד/ה</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר ילד/ה (אופציונלי)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">כללי - ללא שיוך לילד/ה</SelectItem>
                  {childrenList.length > 0 ? (
                    childrenList.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
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
                  <SelectContent>
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
        
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
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
