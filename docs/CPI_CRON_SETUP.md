# הגדרת Cron למשיכת מדד המחירים לצרכן

## 1. הרצה ידנית (לבדיקה)

### אופציה א': דרך Supabase Dashboard
1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט
3. **Edge Functions** → `fetch-cpi-index` → **Invoke**
4. הוסף Header: `X-Cron-Secret` עם הערך מ-`system_settings` (מפתח `cron_secret`)

### אופציה ב': דרך curl (מהטרמינל)

```bash
curl -X POST "https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/fetch-cpi-index" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

החלף `YOUR_CRON_SECRET` בערך מ-`system_settings` (טבלה `system_settings`, שורה `cron_secret`).

### אופציה ג': Super Admin
אם יש לך משתמש עם `is_super_admin`:
```bash
curl -X POST "https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/fetch-cpi-index" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_JWT"
```

---

## 2. Cron אוטומטי (ב־15 לחודש)

המיגרציה `20260303000000_fetch_cpi_cron.sql` מגדירה cron שרץ **ב־15 לכל חודש בשעה 17:00 UTC** (19:00 שעון ישראל בחורף).

### הפעלת ה־Cron

```bash
npx supabase db push
```

או אם המיגרציה כבר רצה – ה־cron אמור להיות פעיל.

### בדיקה שה־Cron קיים

ב-Supabase Dashboard: **Database** → **Cron Jobs** – אמור להופיע `fetch-cpi-index`.

### שינוי שעה

אם רוצים שעה אחרת, ערוך את המיגרציה או הרץ:

```sql
SELECT cron.unschedule('fetch-cpi-index');

SELECT cron.schedule(
  'fetch-cpi-index',
  '0 17 15 * *',  -- דוגמה: 17:00 UTC ב־15 לחודש
  $$
  SELECT net.http_post(
    url:='https://hchmfsilgfrzhenafbzi.supabase.co/functions/v1/fetch-cpi-index',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT setting_value FROM public.system_settings WHERE setting_key = 'cron_secret')
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

### פורמט Cron (דוגמאות)

| ביטוי | משמעות |
|-------|--------|
| `0 17 15 * *` | 17:00 UTC ב־15 לכל חודש |
| `0 18 15 * *` | 18:00 UTC ב־15 לכל חודש |
| `30 16 15 * *` | 16:30 UTC ב־15 לכל חודש |

**הערה:** 19:00 ישראל (חורף UTC+2) = 17:00 UTC.

---

## 3. דרישות

- `pg_cron` ו-`pg_net` מופעלים (ברירת מחדל ב-Supabase)
- ערך `cron_secret` קיים ב-`system_settings`
- Edge Function `fetch-cpi-index` מפורסם (deploy)

### Deploy ל־Edge Function

```bash
npx supabase functions deploy fetch-cpi-index
```
