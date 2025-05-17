
import { z } from 'zod';

export const expenseSchema = z.object({
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'הסכום חייב להיות מספר חיובי',
  }),
  description: z.string().min(2, { message: 'נדרש תיאור של לפחות 2 תווים' }),
  category: z.string().min(1, { message: 'יש לבחור קטגוריה' }),
  childId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
