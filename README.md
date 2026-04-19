# מחציות פלוס – Family Finance Plus

אפליקציית ניהול הוצאות משפחתיות לזוגות הורים, עם תמיכה בהוצאות משותפות, הוצאות מתחדשות ומערכת אישורים.

## תכונות עיקריות

- **הוצאות משותפות** – כל הוצאה דורשת אישור שני ההורים לפני תשלום
- **הוצאות מתחדשות** – תשלומים חודשיים/שבועיים/שנתיים שמיוצרים אוטומטית לפי יום חיוב חשבון
- **עריכת תבנית עם אישור** – שינוי סכום בהוצאה מתחדשת חוזר לסטטוס "ממתין לאישור" ומשמר את הסכום הישן עד לאישור
- **התראות Push / SMS / Email** – שליחת התראה לשותף/ה בכל בקשת אישור
- **RTL / עברית** – ממשק מלא בעברית, כיוון RTL
- **דשבורד** – סיכום חודשי, הוצאות ממתינות, מאושרות, נדחות ושולמו
- **דוחות** – גרפים ופילוח לפי קטגוריה, ילד, חודש

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| State | TanStack Query v5 + Context API |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Cron | Supabase Cron (`generate-monthly-recurring-expenses`) |
| Push | Web Push + FCM (Android) + APNs (iOS) |
| SMS | Twilio (fallback כאשר push נכשל) |
| Routing | react-router-dom v6 |
| Forms | react-hook-form + zod |
| Tests | Vitest |

## התקנה מקומית

```bash
# 1. שכפל את הריפו
git clone <YOUR_GIT_URL>
cd family-finance-plus

# 2. התקן תלויות
npm install

# 3. הגדר משתני סביבה
cp .env.example .env.local
# ערוך את .env.local עם מפתחות Supabase שלך

# 4. הרץ שרת פיתוח
npm run dev
```

## בדיקות

```bash
npm test           # הרץ את כל הבדיקות
npm run test:watch # מצב watch
```

## ארכיטקטורה

```
src/
  pages/           # נתיבי דפים (Dashboard, Reports, Settings…)
  components/
    dashboard/     # ExpenseCard, ExpensesTabs, ExpensesSummary…
    expenses/      # EditRecurringExpenseModal, AddExpenseDialog…
    ui/            # shadcn components
  contexts/
    expense/       # ExpenseContext – מאגר המידע המרכזי
  hooks/           # useSwipeAction, useExpenseFilters…
  integrations/
    supabase/      # expenseService, authService…

supabase/
  functions/       # Edge Functions (notify-expense-approval…)
  migrations/      # כל מיגרציות DB לפי סדר כרונולוגי
```

## הפצה

האפליקציה מופצת ב-Vercel (Frontend) + Supabase (Backend).

```bash
# Edge Functions
supabase functions deploy notify-expense-approval
```
