# ניתוח אינטגרציה: מודול הצמדה אוטומטית למדד המחירים לצרכן

> **סטטוס:** מאושר. ממתין להתחלת המימוש.

---

## נוסחת החישוב (מהאפיון המקורי)

החישוב **תמיד** לפי הנוסחה הבאה:

$$
\text{CurrentAmount} = \text{BaseAmount} \times \left( \frac{\text{CurrentIndex}}{\text{BaseIndex}} \right)
$$

**כללי עיגול:**
- חישובי ביניים: 5 ספרות אחרי הנקודה
- תוצאה סופית להצגה ותשלום: 2 ספרות אחרי הנקודה (אגורות)

**רצפת מדד (Floor):** אם `floor_enabled = true` – הסכום המעודכן לא יורד מתחת לסכום הבסיס:
$$\text{CurrentAmount} = \max\left(\text{CurrentAmount}, \text{BaseAmount}\right)$$

---

## 1. סיכום האפיון מול המערכת הקיימת

### 1.1 מה קיים היום

| רכיב | מצב נוכחי |
|------|-----------|
| **הוצאות חוזרות** | טבלת `expenses` עם `is_recurring`, `frequency` (monthly/weekly/yearly), `recurring_parent_id`, `recurring_active` |
| **הוספת הוצאה חוזרת** | `AddRecurringExpenseModal` – סכום, קטגוריה, תיאור, תדירות, תאריך סיום |
| **יצירת מופעים** | `generate_recurring_expenses` – פונקציית PostgreSQL + Edge Function, רצה יומית ב-06:00 UTC |
| **מסך הגדרות** | `AccountSettings` – טאבים: פרופיל, הגדרות חשבון, משפחה, התראות |
| **הגדרות חשבון** | BillingCycleCard, AvatarSetCard, CategoriesCard, וכו' |

### 1.2 מה חסר לפי האפיון

| רכיב | דרישה | הערות |
|------|-------|-------|
| **טבלת מדד** | `cpi_history` (period, index_value) | חדש |
| **שדות בהוצאה חוזרת** | `base_amount`, `base_index_period`, `is_index_linked`, `floor_enabled`, `last_calculated_amount` | הרחבה ל-expenses |
| **תדירות עדכון** | חודשי / 3 חודשים / שנתי | הרחבה ל-frequency |
| **משיכת מדד** | Cron ב-15 לחודש 19:00 | Edge Function חדש |
| **חישוב סכום** | נוסחת הצמדה לפני יצירת מופע | שינוי ב-generate_recurring_expenses |
| **הגדרות גלובליות** | הגדרת ברירת מחדל למדד | במסך הגדרות |

---

## 2. מיפוי לאפיון – עם מינימום שינויים

### 2.1 מדד: רק להוצאות קבועות שמוסיפים

**דרישת המשתמש:** "אפשר להגדיר רק להוצאות קבועות שמוסיפים".

- הצמדה למדד תהיה **אופציונלית** – מתג "צמוד למדד" בטופס הוספת הוצאה חוזרת.
- **לא להפעיל אוטומטית** – רק כשהמשתמש מפעיל במפורש את הכפתור/מתג "צמוד למדד" בהגדרות.
- רק כש-`is_index_linked = true` – יופעל חישוב הצמדה.
- הוצאות קיימות ללא ההגדרה – ממשיכות לעבוד כרגיל (סכום קבוע).

### 2.2 הגדרות במסך הגדרות

**דרישת המשתמש:** "ההגדרות במסך הגדרות".

- **כרטיס חדש:** `IndexLinkingSettingsCard` בטאב "הגדרות חשבון".
- תוכן:
  - הסבר קצר על הצמדה למדד.
  - קישור ללמ"ס.
  - **רצפת מדד כברירת מחדל** – `floor_enabled = true` כברירת מחדל ברמת חשבון.

---

## 3. שינויים מפורטים (מינימליים)

### 3.1 מסד נתונים

#### טבלה חדשה: `cpi_history`

```sql
CREATE TABLE public.cpi_history (
  period TEXT PRIMARY KEY,        -- 'YYYY-MM' (e.g. '2024-01')
  index_value DECIMAL(10,5) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### הרחבת `expenses` (רק לתבניות חוזרות – `is_recurring=true` ו-`recurring_parent_id IS NULL`)

```sql
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS base_index_period TEXT,      -- 'YYYY-MM'
ADD COLUMN IF NOT EXISTS is_index_linked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS index_update_frequency TEXT, -- 'monthly' | 'quarterly' | 'yearly'
ADD COLUMN IF NOT EXISTS floor_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_calculated_amount DECIMAL(10,2);
```

#### הרחבת `accounts` (הגדרת חשבון)

```sql
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS index_linking_enabled BOOLEAN DEFAULT FALSE;
```

- `index_linking_enabled = false` (ברירת מחדל) – האפשרות "צמוד למדד" לא מוצגת/לא זמינה.
- `index_linking_enabled = true` – המשתמש יכול להוסיף הוצאות צמודות למדד.

**הערה:** `amount` הקיים ישמש:
- כש-`is_index_linked = false` – הסכום הקבוע (כמו היום).
- כש-`is_index_linked = true` – `base_amount` (סכום הבסיס), ו-`last_calculated_amount` יהיה הסכום המעודכן.

### 3.2 API הלמ"ס

- **Endpoint:** `https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false`
- **מבנה:** `month[0].date[]` – כל אובייקט: `{year, month, currBase: {value, baseDesc}}`
- **ערך המדד:** `currBase.value` (למשל 103.3 לינואר 2026)
- **תקופת בסיס:** הלמ"ס משנה בסיס (למשל "2024 ממוצע", "2022 ממוצע") – יש לוודא השוואה בין ערכים באותו בסיס או שימוש ב-chain של שינויים.

### 3.3 Edge Function: משיכת מדד

- **שם:** `fetch-cpi-index`
- **תזמון:** 15 לחודש בשעה 19:00 (ישראל) – יש להתאים ל-UTC (למשל 16:00 UTC בחורף).
- **לוגיקה:**
  1. קריאה ל-API הלמ"ס (כולל pagination – ה-API מחזיר עד 100 רשומות לעמוד).
  2. עבור כל חודש בתשובה: `INSERT`/`UPDATE` ל-`cpi_history` עבור `period = 'YYYY-MM'`, `index_value = currBase.value`.
  3. **שמירת היסטוריה מלאה** – כל ערך נשמר כפי שהוא (currBase.value), לא נורמליזציה.

### 3.4 שינוי `generate_recurring_expenses`

לפני ה-`INSERT` של מופע חדש:

1. אם `is_index_linked = true`:
   - שליפת `base_index_period` ו-`base_amount` מהתבנית.
   - שליפת `BaseIndex` מ-`cpi_history` ל-`base_index_period`.
   - שליפת `CurrentIndex` מ-`cpi_history` לתקופה הרלוונטית (לפי `index_update_frequency`).
   - חישוב: `CurrentAmount = BaseAmount × (CurrentIndex / BaseIndex)` – ביניים ב-5 ספרות.
   - אם `floor_enabled` – `CurrentAmount = MAX(CurrentAmount, BaseAmount)`.
   - עיגול סופי ל-2 ספרות (אגורות).
   - שימוש ב-`CurrentAmount` כ-`amount` של המופע.
2. אם `is_index_linked = false` – כמו היום.
3. עדכון `last_calculated_amount` בתבנית.

### 3.5 UI – טופס הוספת הוצאה חוזרת

ב-`AddRecurringExpenseModal`:

- **מתג "צמוד למדד המחירים לצרכן"** – `is_index_linked`.
- כשמופעל:
  - **סכום בסיס** – `base_amount` (במקום `amount` ישיר).
  - **חודש ושנת מדד הבסיס** – בחירת חודש/שנה → `base_index_period`.
  - **תדירות עדכון** – חודשי / 3 חודשים / שנתי (כל שלוש).
  - **רצפת מדד** – מתג `floor_enabled` (ברירת מחדל: פעיל, מהמסך הגדרות).

### 3.6 UI – טופס עריכת הוצאה חוזרת

ב-`EditRecurringExpenseModal` – אותם שדות, רק לתבניות קיימות.

### 3.7 UI – תצוגת תשלום

- **בכרטיס הוצאה:** אייקון מידע ליד הסכום כשהתשלום צמוד למדד.
- **חלון "איך חישבנו?":**
  - סכום מקורי.
  - מדד בסיס (חודש/שנה).
  - מדד נוכחי.
  - אחוז שינוי.
  - קישור ללמ"ס.

### 3.8 מסך הגדרות

- **כרטיס חדש** בטאב "הגדרות חשבון":
  - `IndexLinkingSettingsCard` – **מתג "צמוד למדד"** (הפעלה מפורשת – לא אוטומטי), הסבר, קישור ללמ"ס, **רצפת מדד כברירת מחדל**.
  - שדה חשבון: `index_linking_enabled` – רק כשהוא מופעל, המשתמש יכול להוסיף הוצאות צמודות למדד.

### 3.9 התראות

- שימוש במערכת ההתראות הקיימת (`NotificationSettings`, `notify-expense-approval` וכו').
- הוספת סוגי התראה: `index_updated_payer`, `index_updated_recipient`.

---

## 4. סדר ביצוע מומלץ

1. **Migration:** `cpi_history` + שדות חדשים ב-`expenses`.
2. **Edge Function:** `fetch-cpi-index` + cron.
3. **שינוי `generate_recurring_expenses`:** לוגיקת הצמדה.
4. **UI:** `AddRecurringExpenseModal` – שדות הצמדה.
5. **UI:** `EditRecurringExpenseModal` – שדות הצמדה.
6. **UI:** `IndexLinkingSettingsCard` במסך הגדרות.
7. **UI:** תצוגת "איך חישבנו?" בכרטיסי הוצאות.
8. **התראות:** סוגים חדשים.

---

## 5. החלטות שאושרו (תשובות המשתמש)

| # | שאלה | תשובה |
|---|------|-------|
| 1 | **תדירות עדכון** | **גם וגם וגם** – חודשי, 3 חודשים, שנתי |
| 2 | **תדירות הוצאה** | **רק חודשי** – הצמדה למדד רק ל-`frequency = 'monthly'` (לא weekly) |
| 3 | **בסיס מדד בלמ"ס** | **כן ולשמור היסטוריה** – לאחסן `currBase.value` כפי שהוא, לשמור היסטוריה מלאה |
| 4 | **הפעלה אוטומטית** | **רק אם הכפתור מופעל** – לא להפעיל אוטומטית למשתמשים; רק כשמפעיל במפורש "צמוד למדד" בהגדרות |
| 5 | **רצפת מדד** | **כן כברירת מחדל** – `floor_enabled = true` כברירת מחדל |

---

## 6. קבצים מרכזיים שישתנו

| קובץ | שינוי |
|------|-------|
| `supabase/migrations/` | migration חדש |
| `supabase/functions/fetch-cpi-index/` | Edge Function חדש |
| `supabase/migrations/20260301200000_*.sql` | עדכון `generate_recurring_expenses` |
| `src/components/expenses/AddRecurringExpenseModal.tsx` | שדות הצמדה |
| `src/components/expenses/EditRecurringExpenseModal.tsx` | שדות הצמדה |
| `src/components/account/IndexLinkingSettingsCard.tsx` | כרטיס חדש |
| `src/pages/AccountSettings.tsx` | הוספת IndexLinkingSettingsCard |
| `src/components/dashboard/ExpenseCard.tsx` | אייקון + חלון "איך חישבנו?" |
| `src/contexts/expense/types.ts` | שדות חדשים ב-Expense |
| `src/integrations/supabase/types.ts` | עדכון types (או יופק מחדש) |

---

---

## 7. נוסחת החישוב – עותק מהאפיון

```
CurrentAmount = BaseAmount × (CurrentIndex / BaseIndex)
```

- **עיגול ביניים:** 5 ספרות אחרי הנקודה
- **עיגול סופי:** 2 ספרות (אגורות)
- **רצפת מדד:** CurrentAmount = max(CurrentAmount, BaseAmount) כאשר floor_enabled
