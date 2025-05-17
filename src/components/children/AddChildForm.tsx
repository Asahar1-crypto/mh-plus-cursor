
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy')
                        ) : (
                          <span>בחר תאריך</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => 
                        date > new Date() || 
                        date < new Date('2000-01-01')
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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
