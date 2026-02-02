import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { useExpense } from '@/contexts/ExpenseContext';

const childSchema = z.object({
  name: z.string().min(2, { message: 'השם חייב להיות לפחות 2 תווים' }),
  birthDate: z.date({
    required_error: 'יש לבחור תאריך לידה',
  }),
});

type AddChildFormProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AddChildForm: React.FC<AddChildFormProps> = ({ open, setOpen }) => {
  const { addChild } = useExpense();
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<z.infer<typeof childSchema>>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof childSchema>) => {
    setIsPending(true);
    try {
      await addChild({
        name: data.name,
        birthDate: format(data.birthDate, 'yyyy-MM-dd'),
      });
      
      form.reset();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>הוספת ילד/ה חדש/ה</DialogTitle>
        <DialogDescription>
          הוסף פרטים אודות הילד/ה
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>שם</FormLabel>
                <FormControl>
                  <Input placeholder="ישראל/ה" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>תאריך לידה</FormLabel>
                <FormControl>
                  <BirthDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="בחר תאריך לידה"
                    minYear={2000}
                    maxYear={new Date().getFullYear()}
                  />
                </FormControl>
                <FormDescription>
                  תאריך הלידה של הילד/ה
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  שומר...
                </span>
              ) : (
                'שמור'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default AddChildForm;
