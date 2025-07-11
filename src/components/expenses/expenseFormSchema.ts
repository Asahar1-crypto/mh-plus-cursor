
import { z } from 'zod';

export const expenseSchema = z.object({
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'הסכום חייב להיות מספר חיובי',
  }),
  description: z.string().min(2, { message: 'נדרש תיאור של לפחות 2 תווים' }),
  category: z.string().min(1, { message: 'יש לבחור קטגוריה' }),
  childId: z.string().optional(),
  paidById: z.string().min(1, { message: 'יש לבחור מי צריך לשלם' }),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
  hasEndDate: z.boolean().default(false),
  endDate: z.date().optional(),
  includeInMonthlyBalance: z.boolean().default(true),
  splitEqually: z.boolean().default(false),
  date: z.date().default(() => new Date()),
  receipt: z.string().optional(),
}).refine((data) => {
  // אם זה הוצאה קבועה עם תאריך סיום, תאריך הסיום חייב להיות אחרי תאריך ההתחלה
  if (data.hasEndDate && data.endDate && data.isRecurring) {
    return data.endDate > data.date;
  }
  return true;
}, {
  message: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
  path: ['endDate']
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
