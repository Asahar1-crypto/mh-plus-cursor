# משימות ביקורת אבטחה - מחציות פלוס

> **הערה:** שמירה בלבד – לא בוצע. משימות לביצוע עתידי.

---

## 1. אבטחה (Security)

### נקודות חזקות:
- RLS policies על כל הטבלאות (members-based model)
- DB trigger מטפל ב-self-approval
- Storage bucket עם signed URLs
- Zod validation על כל הסכמות
- Service role key רק ב-Edge Functions

### פערים לשיפור:
- **CSP Headers** – אין Content-Security-Policy על מרבית הדומיין, רק ב-Vercel
- **Security Headers** – X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security
- **Rate Limiting** – Edge Functions מוגנים (register-user, otp-send, phone-login, verify-sms-code) אבל לא בצד לקוח
- **5 Edge Functions** עם verify_jwt = false – צריך בדיקה נרחבת: delete-user, delete-tenant, generate-recurring-expenses
- **IDOR בדיקה** – אם משתמש ממשק חשבון של tenant אחר – לא חוסם

---

## 2. חוויית משתמש (UX)

### כבר קיים:
- Flow מלא התחברות (אימייל + SMS OTP)
- Flow התחברות (טלפון / אימייל + OTP)
- Flow חשבון/פתוח שׁמוזמן
- Flow טלפון יחיד
- RTL מכסמה לכלב תירבעו
- Responsive: פוטקסד, טלבאט, לייבמוב
- Dark mode
- Error states – מכסמות מפורטות הרוק המ
- Empty states – מנותנ תפסוה ינפל מקים מכסמ
- תוקלח תויצמינא, הניעט ינמז – מעצוביב

---

## 3. התחברות וחשבון (Auth)

### איכות בדיקה ישירה:
- מקים חזקים אימייל עם התחברות
- מקים חזקים טלפון רפסמ עם התחברות
- OTP פיקות גפש
- OTP (תונויסינ +3) יוגש
- היוגש טלפון עם התחברות
- Session expiry – שכ הרוק המ-JWT פיקות גפ
- Password reset flow הצקל הצקמ
- change-user-email אימייל יוניש
- משתמש תקיחמ

---

## 4. לוגיקת הוצאות

- מלא CRUD – תימעפ-דח האצוה
- הכירע, הייהשה, instances תריצי, template תריצי – תרזוח האצוה
- self-approval תעינמ ללוכ – approval flow תואצוה רושיא
- split תואצוה תקולח
- מנוכנ מבשיח – ישדוח נזאמ
- סוטטס, שדוח, הירוגטק, דלי יפל – מרטליפ
- הקיחמ, הייפצ, האלעה – תולבק יצבק
- PDF export
- Budget alerts

---

## 5. תשתית (Infrastructure)

### אדוול כצר המ:
- Vercel – יטליבדייליר, CDN, redirects
- Supabase – ממייגיב, connection pooling, limits
- Cron jobs – generate-recurring-expenses 6:00-ב מוי לכ צר
- Edge Functions – cold start times, timeout handling
- Capacitor – Android + iOS builds מדבוע
- Push Notifications – Firebase FCM הצקל הצקמ דבוע
- SMS – תחילש SMS תדבוע (Twilio/רחא קפס)
- SendGrid – ממיעיגמ מליימיא (ב אל-spam)

---

## 6. סיכום – מה אני המ לעצבל בדיקה ישירה

| כלב | הקידב | האבטחה |
|-----|-------|--------|
| דוק תאירק | verify_jwt=false ממ Edge Functions תקירס | החטבא |
| vercel.json תכירע | Vercel-ב Security Headers תפסוה | החטבא |
| Grep | דוקב תודוס/תוחתפמ תפישח תקידב | החטבא |
| דוק תאירק | SQL injection vectors תקידב | החטבא |
| מטסט תביתכ | expenses לע מטסט 24 קר עגרכ – מטסטה יוסיכ תבחרה | תוקידב |
| דוק תאירק | רסח error handling תקידב | דוק |
| דוק תאירק | input validation gaps תקידב | דוק |
| מצבק תאירק | Vercel תורדגה תקידב | תיתשת |

---

## משימות להשלמת המ

1. **Security Headers נוקית** – הובג טקפמיא לעבו ריהמ
2. **Edge Functions תקירס** – עדימ תפישח ניאש אדוול בתוירוביצ
3. **Rate limiting** – תעינמל ינויח abuse
4. **םיטסט תבחרה** – edge cases-ו auth flow יוסיכ

---

*נוצר: 2025-03-15 | מקור: ביקורת אבטחה*
