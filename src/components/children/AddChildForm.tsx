import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { useExpense } from '@/contexts/ExpenseContext';

const childSchema = z.object({
  name: z.string().min(2, { message: 'השם חייב להיות לפחות 2 תווים' }),
  gender: z.enum(['son', 'daughter'], { required_error: 'יש לבחור בן או בת' }),
  birthDate: z.date({
    required_error: 'יש לבחור תאריך לידה',
  }),
  budgetLimit: z.string().optional(),
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
      gender: undefined,
    },
  });

  const onSubmit = async (data: z.infer<typeof childSchema>) => {
    setIsPending(true);
    try {
      const budgetLimit = data.budgetLimit ? parseFloat(data.budgetLimit) : undefined;
      await addChild({
        name: data.name,
        gender: data.gender,
        birthDate: format(data.birthDate, 'yyyy-MM-dd'),
        budgetLimit: budgetLimit && budgetLimit > 0 ? budgetLimit : undefined,
      });
      
      form.reset();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg">הוספת ילד/ה חדש/ה</DialogTitle>
        <DialogDescription className="text-xs sm:text-sm">
          הוסף פרטים אודות הילד/ה
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">שם</FormLabel>
                <FormControl>
                  <Input placeholder="ישראל/ה" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Gender selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">בן / בת</Label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {([
                { value: 'son' as const, label: 'בן', image: '/avatars/roles/son.png' },
                { value: 'daughter' as const, label: 'בת', image: '/avatars/roles/daughter.png' },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => form.setValue('gender', option.value)}
                  className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl border-2 transition-all duration-200 text-xs sm:text-sm font-medium ${
                    form.watch('gender') === option.value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground'
                  }`}
                >
                  <img src={option.image} alt={option.label} className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-full" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            {form.formState.errors.gender && (
              <p className="text-xs text-destructive">{form.formState.errors.gender.message}</p>
            )}
          </div>
          
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-sm">תאריך לידה</FormLabel>
                <FormControl>
                  <BirthDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="בחר תאריך לידה"
                    minYear={2000}
                    maxYear={new Date().getFullYear()}
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  תאריך הלידה של הילד/ה
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budgetLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">תקציב חודשי (₪) — אופציונלי</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="לדוגמה: 500"
                    min="0"
                    step="0.01"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  הגבלת תקציב חודשית לילד
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="sm:justify-end">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
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
