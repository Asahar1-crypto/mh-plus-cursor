# דוח בדיקת רספונסיביות – מחציות פלוס

**תאריך:** 2026-02-28

## סיכום

המערכת תומכת במסכים שונים עם breakpoints מותאמים. בוצעו תיקונים לשיפור החוויה במובייל.

---

## מה נבדק ומה תוקן

### 1. Viewport ו-Meta
- **Viewport:** `width=device-width`, `viewport-fit=cover` – תומך במכשירים עם notch
- **תיקון:** הוסר `user-scalable=no` – מאפשר זום עד 5x לצורכי נגישות (WCAG)

### 2. Breakpoints (Tailwind)
| Breakpoint | רוחב | שימוש |
|------------|------|-------|
| xs | 475px | מסכים קטנים מאוד |
| sm | 640px | מובייל |
| md | 768px | טאבלט |
| lg | 1024px | דסקטופ |
| xl | 1280px | דסקטופ רחב |
| 2xl | 1536px | מסכים גדולים |

### 3. Touch Targets (מטרות מגע)
- **תיקון:** כפתורים ואלמנטים אינטראקטיביים – מינימום 44x44px במובייל (הנחיות Apple/Google)
- **מיקום:** `src/index.css` – media query ל-`max-width: 640px`

### 4. Layout ראשי
- **AppLayout:** Sidebar מתקפל למובייל (drawer), תוכן full-width
- **AppHeader:** כפתור המבורגר במובייל, Logo מותאם
- **AppSidebar:** Drawer מימין (RTL) עם backdrop

### 5. טבלאות
- **ExpensesTable:** במובייל – כרטיסים (ExpenseCardMobile), בדסקטופ – טבלה עם `overflow-x-auto`
- **AdminSmsLogs:** שתי הטבלאות עם `overflow-x-auto`
- **RecurringExpensesTable, CustodyTable:** שימוש ב-`useIsMobile` ל-layout מותאם

### 6. טפסים ומודלים
- **AddChildForm:** `w-[95vw] sm:max-w-[425px]`
- **BudgetModal:** `w-[95vw] max-w-[600px]`
- **Login/Register:** `max-w-md`, padding מותאם

### 7. דוחות (Reports)
- **ReportsPeriodFilter:** `flex-wrap` – סלקטורים עוברים שורה במובייל
- **תיקון:** לוח שנה – חודש אחד במובייל, שניים בדסקטופ
- **תיקון:** PopoverContent – `max-w-[95vw]` למניעת overflow

### 8. AccountSwitcher
- **תיקון:** `space-x-2` → `gap-2` לתאימות RTL
- **תיקון:** רוחב מותאם – `w-[120px] xs:w-[140px] sm:w-[200px]`

### 9. ExpenseCardMobile
- **תיקון:** כפתורי פעולה – `flex-wrap` ו-`flex-col xs:flex-row` למסכים צרים

### 10. Safe Area
- **קיים:** `env(safe-area-inset-*)` ב-CSS למכשירים עם notch
- **קיים:** `body.platform-ios.native-app` – padding-top ל-iOS

### 11. Overflow
- **קיים:** `overflow-x-hidden` על `html`, `body`, `main`
- **קיים:** `max-width: 100vw` על body

---

## המלצות לבדיקה ידנית

1. **מובייל (320px–480px):** דשבורד, הוצאות, הוספת הוצאה, דוחות, הגדרות
2. **טאבלט (768px):** מעבר בין sidebar מלא/מקופל
3. **מכשירים עם notch:** iPhone X ומעלה – וידוא safe area
4. **אוריינטציה:** סיבוב מסך (portrait/landscape)
5. **RTL:** וידוא שכל האלמנטים מיושרים נכון

---

## קבצים שעודכנו

- `index.html` – viewport
- `android/.../index.html` – viewport
- `src/index.css` – touch targets
- `src/components/account/AccountSwitcher.tsx` – RTL, רוחב
- `src/components/expenses/ExpenseCardMobile.tsx` – layout כפתורים
- `src/components/reports/ReportsPeriodFilter.tsx` – לוח שנה, Popover
