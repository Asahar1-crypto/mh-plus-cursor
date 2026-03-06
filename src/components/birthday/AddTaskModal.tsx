import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskCategory } from '@/integrations/supabase/birthdayService';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  venue: 'מקום',
  food: 'אוכל',
  entertainment: 'בידור',
  gifts: 'מתנות',
  photography: 'צילום',
  invitations: 'הזמנות',
  decoration: 'קישוטים',
  misc: 'כללי',
};

const schema = z.object({
  title: z.string().min(2, 'נדרש שם משימה'),
  category: z.enum(['venue','food','entertainment','gifts','photography','invitations','decoration','misc'] as const),
  estimatedAmount: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; category: TaskCategory; estimatedAmount: number | null }) => Promise<void>;
  isLoading?: boolean;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, onAdd, isLoading }) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', category: 'misc', estimatedAmount: '' },
  });

  const handleSubmit = async (values: FormValues) => {
    await onAdd({
      title: values.title,
      category: values.category,
      estimatedAmount: values.estimatedAmount ? parseFloat(values.estimatedAmount) : null,
    });
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הוסף משימה</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם משימה</FormLabel>
                  <FormControl>
                    <Input placeholder="לדוגמה: עוגת יום הולדת" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר קטגוריה" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.entries(CATEGORY_LABELS) as [TaskCategory, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סכום משוער (₪, אופציונלי)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'שומר...' : 'הוסף'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
