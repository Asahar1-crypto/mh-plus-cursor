Now I have enough context. Let me produce the complete wireframe spec.

---

# Family Finance Plus — Custody Feature Wireframe Spec

**Version:** 1.0 · Implementation-ready
**Scope:** Onboarding CustodyStep, Settings card, `/custody-calendar` refactor, conflicts, swaps, historical edits, virtual-partner, admin panel, shared components, toasts.
**Visual DNA sources:** `OnboardingModal.tsx` (shadcn Dialog chrome, `animate-in fade-in slide-in-from-right`, 16px rounded icon tile with `bg-primary/10`, centered header, 3-button footer "חזור / דלג / המשך"), `ChildrenStep.tsx` (card items with `group p-4 rounded-lg border bg-card hover:border-primary/50`, staggered `animationDelay: index*100ms`, gradient primary CTA), `BillingCycleStep.tsx` (`Alert` with `Info` icon for explainer, selectable cards `border-2` with `bg-primary/5 shadow-md` when active), `AccountSettings.tsx` (Tabs with `dir="rtl"`, `bg-card/80 border border-border/50 rounded-xl`, section cards `bg-card border border-border/50`).

**Color tokens used in this spec:**
- Parent A = `bg-primary/10 border-r-4 border-primary` (deep teal)
- Parent B = `bg-accent/10 border-r-4 border-accent` (amber)
- Shared = diagonal `bg-gradient-to-br from-primary/15 to-accent/15` with dashed internal divider
- Unassigned = `border border-dashed border-muted-foreground/40 bg-muted/20`
- Conflict = `ring-2 ring-destructive/60 bg-destructive/5`
- Historical edit = `after:content-['שונה'] Badge`

---

## A) Onboarding CustodyStep

**Position in wizard:** New step inserted as index `3` (after RecurringExpensesStep) — title `'הלו"ז שלי'`. `STEP_TITLES` becomes 8 items, so update constants. The step is a **multi-screen sub-wizard** rendered inside the single outer OnboardingModal slot — it owns its own sub-step state (`custodySubStep: 0..5`).

**State shape** (lives in the CustodyStep component, saved on "המשך" of A6):
```
{
  preset: 'week_on_week' | 'two_two_three' | 'mw_alt_weekends' | 'tt_alt_weekends' |
          'weekdays_weekends' | 'alt_weekends_only' | 'three_four_four_three' | 'custom',
  weeklyPattern: WeeklyPattern,   // 7 slots: 'me' | 'other' | 'shared'  (A–G indexed Sun..Sat)
  handoffTime: '14:00' | '18:00' | { custom: 'HH:mm' },
  startDate: Date,
  currentWeekHolder: 'me' | 'other',  // only used by 2-week presets
  partnerMode: 'existing' | 'virtual' | 'solo',
  virtualPartnerName?: string
}
```

**Persistence:** A1–A5 mutate local state only. A6 "שמור והמשך" writes to `custody_patterns` + `custody_pattern_weekdays` + `accounts.custody_handoff_default` in a single Supabase transaction via RPC `upsert_custody_pattern`. Only then does `onNext()` fire and advance the outer OnboardingModal.

**Skip semantics across A1–A6:** The outer modal's "דלג לעכשיו" is hidden while inside CustodyStep sub-steps; instead A1 shows `"אדלג לעכשיו — אגדיר אחר־כך"` which calls outer `onSkip()` and inserts `onboarding_state.custody_skipped=true`. Inside A2–A6 the button is labelled `"חזור"` only — no skip (user is already committed).

### A1 — Intro / Preset Picker

**Layout (desktop, RTL):**
```
┌────────────────────────────────────────────────────────────┐
│                      [✕ close top-left]                    │
│                                                            │
│           ○  ○  ○  ●  ○  ○  ○  ○    (progress, step 4/8)   │
│                                                            │
│                    ⌂  (home-heart icon, 64px)              │
│                    bg-primary/10 rounded-full              │
│                                                            │
│                  הלו"ז שלי                                 │
│      בחרו איך הילדים מחולקים ביניכם בשבוע רגיל             │
│      (אפשר תמיד לשנות בהגדרות החשבון)                     │
│                                                            │
│  ┌────────────── Alert bg-muted/40 ───────────────────┐    │
│  │ ℹ  החלוקה הזו היא להצגה בלבד — אין לה השפעה על      │    │
│  │   ההוצאות או על החלוקה הכספית ביניכם.              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ שבוע-שבוע │  │  2-2-3   │  │ א'/ג'+סופ"ש│  │ ב'/ד'+סופ"ש│    │
│  │ preview:  │  │ preview: │  │ לסירוגין  │  │ לסירוגין  │    │
│  │ 7 pills   │  │ 7 pills  │  │ preview:  │  │ preview:  │    │
│  │ הכי נפוץ ⭐│  │          │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ ימות     │  │ סופ"ש    │  │ 3-4-4-3  │  │ מותאם    │    │
│  │ השבוע /  │  │ לסירוגין │  │          │  │ אישית    │    │
│  │ סופ"ש    │  │ בלבד     │  │          │  │ ✎         │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                            │
│  [ חזור ]                    [ אדלג לעכשיו ] [ המשך ➤ ]    │
└────────────────────────────────────────────────────────────┘
```

**Mobile:** Grid becomes 2×4; preset previews shrink from 7 pills to 7 dots. Body scrolls; footer sticks.

**Microcopy:**
- Header: `הלו"ז שלי`
- Sub: `בחרו איך הילדים מחולקים ביניכם בשבוע רגיל`
- Hint: `(אפשר תמיד לשנות בהגדרות החשבון)`
- Info alert: `החלוקה הזו היא להצגה בלבד — אין לה השפעה על ההוצאות או על החלוקה הכספית ביניכם.`
- Preset labels (in cards, in this order):
  1. `שבוע-שבוע` + small tag `הכי נפוץ`
  2. `2-2-3`
  3. `א'/ג' + סופ"ש לסירוגין`
  4. `ב'/ד' + סופ"ש לסירוגין`
  5. `ימות השבוע / סופ"ש`
  6. `סופ"ש לסירוגין בלבד`
  7. `3-4-4-3`
  8. `מותאם אישית`
- Preset sub-text under each title: one-line plain Hebrew description. Examples:
  - שבוע-שבוע: `שבוע אצלי, שבוע אצל ההורה השני. החלפה בימי ראשון.`
  - 2-2-3: `יומיים-יומיים, וסוף שבוע לסירוגין.`
  - מותאם אישית: `אני מסמן ידנית כל יום בשבוע.`
- Footer buttons: `חזור` · `אדלג לעכשיו` · `המשך`

**Interaction:**
- Click a preset card → border becomes `border-primary bg-primary/5 shadow-md`, adds a subtle check-mark top-left inside the card. Updates `preset` and auto-fills `weeklyPattern` from a lookup map.
- `המשך` enabled once `preset` truthy.
- If `preset === 'custom'` → next step is **A2**. Else skip A2, go to A3.
- `חזור` → returns to RecurringExpensesStep (outer wizard).
- `אדלג לעכשיו` → outer `onSkip()`, marks custody skipped in `onboarding_state`, advances to VirtualPartnerStep.

**Primitives:** shadcn `Alert`, custom `PresetCard` (see J1), `Button`, outer `Dialog` from OnboardingModal.

**States:**
- Loading: shimmer grid of 8 cards (`bg-muted/30 animate-pulse`).
- Error (preset lookup fails client-side — rare): toast `שגיאה בטעינת התבניות. נסו לרענן את הדף.`
- Disabled: `המשך` is disabled (greyed) with tooltip `בחרו תבנית או "מותאם אישית"`.

**A11y / focus:**
- First focus on close button → then on first preset card (listbox).
- Preset cards are a `role="radiogroup"`, each card `role="radio"` `aria-checked`.
- Arrow keys navigate among preset cards; `Enter`/`Space` selects.
- `aria-label` on info alert: `הודעה: החלוקה לא משפיעה על כספים`.

---

### A2 — Custom Weekly Grid (only if preset === 'custom')

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│   ○ ○ ○ ● ○ ○ ○ ○    (progress 4/8)                         │
│                                                            │
│               ⌂  (same primary tile)                        │
│             שבוע רגיל — מי מחזיק בכל יום?                  │
│   לחצו על כל יום כדי להחליף בין: אני / ההורה השני / משותף  │
│                                                            │
│   ┌─ WeekGrid (see J2) ────────────────────────────────┐   │
│   │  יום א׳   יום ב׳   יום ג׳   יום ד׳  יום ה׳  ו׳  ש׳ │   │
│   │  [ אני ] [השני] [אני ] [השני] [ אני ] [ משותף ] [משותף]│   │
│   │  (teal) (amber) (teal) (amber) (teal)  (split)  (split)│   │
│   └───────────────────────────────────────────────────┘   │
│                                                            │
│   ┌─ Legend (static) ───────────────────────────────┐      │
│   │  ▉ אני   ▉ ההורה השני   ◫ משותף                 │      │
│   └────────────────────────────────────────────────┘       │
│                                                            │
│   ┌─ Alert bg-secondary/30 ──────────────────────────┐     │
│   │ סיכום: אני 3 ימים · ההורה השני 2 ימים · משותף 2   │     │
│   └──────────────────────────────────────────────────┘     │
│                                                            │
│   [ חזור ]                                     [ המשך ]    │
└────────────────────────────────────────────────────────────┘
```

**Mobile (<640px):** 7 pills become a 2-row wrap: 4 on top (א–ד), 3 on bottom (ה, ו, ש). Each pill full-width of its grid cell, min 56px tap target.

**Microcopy:**
- Header: `שבוע רגיל — מי מחזיק בכל יום?`
- Helper: `לחצו על כל יום כדי להחליף בין: אני / ההורה השני / משותף`
- Labels inside pills: `אני` / `ההורה השני` / `משותף`
- Legend: `אני` · `ההורה השני` · `משותף`
- Summary (updates live): `סיכום: אני X ימים · ההורה השני Y ימים · משותף Z`
- If all 7 days are one color: warning alert `לא מוגדרים ימים להורה השני. אפשר להמשיך, אבל ודאו שזה מה שהתכוונתם.`
- If all 7 days are `shared`: error `צריך לסמן לפחות יום אחד ספציפי להורה אחד.` → `המשך` disabled.

**Interaction:**
- Tap day pill → cycles `me → other → shared → me`. Animates `scale 0.96 → 1` (150ms).
- Long-press (mobile) or right-click (desktop) opens 3-option popover to pick directly.
- `המשך` always enabled unless all 7 are `shared`.
- `חזור` → back to A1 (preset selection).

**Primitives:** Custom `WeekGrid` (J2), shadcn `Alert`, lucide `Info`.

**States:**
- Only error state is the "all shared" case above.

**A11y:**
- Each day pill is a `<button role="switch">` with `aria-label="יום ראשון: אני"` etc.
- `aria-live="polite"` region above summary so screen reader announces changes.
- Tab navigates day 1 → day 7 → footer buttons.

---

### A3 — Handoff Time

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│   ○ ○ ○ ● ○ ○ ○ ○    (still step 4/8 of outer)             │
│                                                            │
│              🕐  (Clock icon tile)                          │
│          שעת ההעברה בין הבתים                              │
│   מתי בדרך כלל הילדים עוברים מבית לבית בימי החלפה?         │
│                                                            │
│  ┌─────── radio cards ────────────────────────────┐        │
│  │ ○ אחרי ביה"ס — 14:00                           │        │
│  │   טוב לגיל גן / יסודי                          │        │
│  ├───────────────────────────────────────────────┤        │
│  │ ● ערב — 18:00   (ברירת מחדל)                  │        │
│  │   אחרי חוגים וארוחת צהריים                    │        │
│  ├───────────────────────────────────────────────┤        │
│  │ ○ מותאם — בחרו שעה                             │        │
│  │   [ 18:00 ▾ ]   (Time input appears when selected)│    │
│  └───────────────────────────────────────────────┘        │
│                                                            │
│  ℹ  זה רק ברירת מחדל. לכל יום אפשר לקבוע שעה אחרת בלו"ז.  │
│                                                            │
│  [ חזור ]                                       [ המשך ]   │
└────────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `שעת ההעברה בין הבתים`
- Sub: `מתי בדרך כלל הילדים עוברים מבית לבית בימי החלפה?`
- Options (order matters):
  - `אחרי ביה"ס — 14:00` · hint `טוב לגיל גן / יסודי`
  - `ערב — 18:00` + inline small `(ברירת מחדל)` pill · hint `אחרי חוגים וארוחת צהריים`
  - `מותאם — בחרו שעה`
- Info at bottom: `זה רק ברירת מחדל. לכל יום אפשר לקבוע שעה אחרת בלו"ז.`

**Interaction:**
- Radio card selection matches BillingCycleStep.tsx pattern (same `border-2 bg-primary/5` active state).
- Selecting `מותאם` reveals a native `<input type="time">` below the option (animate `slide-in-from-top`). `המשך` disabled until time is filled.
- `המשך` → A4.
- `חזור` → A1 or A2 depending on preset.

**A11y:**
- `role="radiogroup"`, `aria-labelledby` points to "שעת ההעברה בין הבתים".
- Focus order: radio 1 → 2 → 3 → (if custom visible) time input → footer.

---

### A4 — Start Date + Current Week Holder

**Visible only when** `preset ∈ { week_on_week, mw_alt_weekends, tt_alt_weekends, alt_weekends_only, three_four_four_three }`. For `two_two_three`, `weekdays_weekends`, `custom` — skip directly to A5 (no rotation concept).

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│             📅 (CalendarDays icon tile)                     │
│              מאיזה תאריך מתחיל הלו"ז?                       │
│   ובאיזה שבוע אנחנו נמצאים כרגע?                            │
│                                                            │
│   תאריך התחלה                                               │
│   [ 🗓  יום ראשון, 26.04.2026  ▾ ] ← shadcn Popover+Calendar│
│                                                            │
│   השבוע הנוכחי (26.04 – 02.05) הוא:                         │
│   ┌────────────────────┐  ┌────────────────────┐           │
│   │ ● אצלי             │  │ ○ אצל ההורה השני   │           │
│   │   (teal highlight) │  │                    │           │
│   └────────────────────┘  └────────────────────┘           │
│                                                            │
│   ┌─ 14-day preview (J3) ──────────────────────────┐       │
│   │ א׳  ב׳  ג׳  ד׳  ה׳  ו׳  ש׳  א׳  ב׳  ג׳  ד׳  ה׳  ו׳  ש׳│ │
│   │ אני אני אני אני אני אני אני  השני השני השני ...     │ │
│   │ 26   27   28   29   30   1    2    3    4    5 ...  │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                            │
│   [ חזור ]                                      [ המשך ]   │
└────────────────────────────────────────────────────────────┘
```

**Mobile:** 14-day ribbon collapses to 7 days with `«» ריבוע` swipe; see J3.

**Microcopy:**
- Header: `מאיזה תאריך מתחיל הלו"ז?`
- Sub: `ובאיזה שבוע אנחנו נמצאים כרגע?`
- Date label: `תאריך התחלה`
- Preview title: `השבוע הנוכחי (DD.MM – DD.MM) הוא:`
- Options: `אצלי` / `אצל ההורה השני`
- Preview heading above 14-day: `כך ייראו השבועיים הקרובים:`

**Interaction:**
- Date picker: shadcn `Popover` + `Calendar` locale `he`. Default = next Sunday from today.
- Validation: start date must be within 1 year (past or future). If in past, show inline hint `תאריך עבר — הלו"ז יחושב רטרואקטיבית` (not blocking).
- Selecting `אצלי` / `אצל ההורה השני` re-renders the 14-day ribbon instantly.
- `המשך` → A5. Enabled once start date picked and holder chosen.

**States:**
- Invalid date (>1 year future): disabled `המשך`, error text `בחרו תאריך עד שנה קדימה`.

**A11y:**
- Date button `aria-label="תאריך התחלת הלו""ז, לחצו לבחירה"`.
- Week-holder cards same radiogroup pattern as A3.

---

### A5 — The Other Parent

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│             👥 (Users icon tile)                            │
│             ומי ההורה השני?                                 │
│  מי חולק/ת איתך את הלו"ז?                                   │
│                                                            │
│  ┌─ option card ──────────────────────────────────────┐    │
│  │ ○ דנה מזרחי (dana@example.com)                     │    │
│  │   כבר חברה בחשבון ✓                               │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ ○ אני מזמין/ה עכשיו  — הזנת אימייל                │    │
│  │   [email input slides in when selected]            │    │
│  │   [ דוא"ל: __________________ ]                    │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ ● אני אגדיר הכל לבד בינתיים (הורה וירטואלי)        │    │
│  │   [ שם ההורה השני: ___________ ]                   │    │
│  │   אוכל להזמין אותו/ה אחר־כך.                       │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ ○ אני הורה יחיד/ה — אין הורה שני                  │    │
│  │   הלו"ז יציג רק אותי.                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  [ חזור ]                                      [ המשך ]    │
└────────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `ומי ההורה השני?`
- Sub: `מי חולק/ת איתך את הלו"ז?`
- Option 1 (only shown if other account_member exists): shows `{full_name} ({email}) · כבר חברה בחשבון`
- Option 2: `אני מזמין/ה עכשיו — הזנת אימייל` + placeholder `name@example.com`
- Option 3: `אני אגדיר הכל לבד בינתיים (הורה וירטואלי)` + input label `שם ההורה השני`, placeholder `לדוגמה: דנה`; hint `אוכל להזמין אותו/ה אחר־כך.`
- Option 4: `אני הורה יחיד/ה — אין הורה שני` + hint `הלו"ז יציג רק אותי.`

**Interaction:**
- Auto-default:
  - If `account_members.length === 2` → Option 1 pre-selected.
  - Else → Option 3 pre-selected with placeholder name "ההורה השני".
- Option 2 "invite" validates email client-side (`zod.string().email()`), sends invite via existing `sendInvitation` on A6 save.
- Option 4 sets `partnerMode='solo'`. Hides all "complement" and "conflict" UI later in the app.
- `חזור` → A4 (or A3 if A4 was skipped).

**States:**
- If email invalid: inline error `כתובת אימייל לא תקינה`. `המשך` disabled.
- If partner already invited (pending) via other flow: show badge `הזמנה פתוחה — ממתין/ה לתשובה`.

**A11y:**
- Radiogroup. Tab order: options → conditional input → footer.

---

### A6 — Preview & Save

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│             ✓ (Check-heart icon, green-tinted primary)      │
│             מוכן/ה? נעבור על הכל                            │
│                                                            │
│  ┌─ Summary card bg-muted/30 ──────────────────────────┐   │
│  │ תבנית:          שבוע-שבוע                           │   │
│  │ שעת העברה:      18:00                              │   │
│  │ התחלה:          יום ראשון, 26.04.2026              │   │
│  │ השבוע הנוכחי:   אצלי                               │   │
│  │ הורה שני:       דנה (וירטואלית)                     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  תצוגה מקדימה — 4 שבועות הקרובים:                           │
│  ┌──────────────────────────────────────────────────┐     │
│  │ [ Month-grid mini — 4 weeks, same cell colors ]  │     │
│  │ (uses MonthGrid component in read-only mode)     │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
│  ℹ  אפשר תמיד לשנות הכל בהגדרות → לשונית "הגדרות חשבון"    │
│                                                            │
│  [ חזור ]  [ התחלה מחדש ]              [ שמור והמשך ]      │
└────────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `מוכן/ה? נעבור על הכל`
- Summary labels: `תבנית:` / `שעת העברה:` / `התחלה:` / `השבוע הנוכחי:` / `הורה שני:`
- Preview title: `תצוגה מקדימה — 4 שבועות הקרובים:`
- Info: `אפשר תמיד לשנות הכל בהגדרות → לשונית "הגדרות חשבון"`
- Primary CTA: `שמור והמשך`
- Secondary: `התחלה מחדש` (returns to A1, clears local state)

**Interaction:**
- `שמור והמשך` → shows button spinner `שומר...`, calls RPC `upsert_custody_pattern(payload)`, on success: toast `הלו"ז נשמר בהצלחה`, fires outer `onNext()` → VirtualPartnerStep (or SuccessStep if VirtualPartnerStep replaced).
- `חזור` → A5.
- `התחלה מחדש` → confirm dialog `לאפס את הלו"ז? ההגדרות הנוכחיות ימחקו.` → [ביטול] / [אפס]. On confirm: reset state, go to A1.

**States:**
- Save success → toast `הלו"ז נשמר בהצלחה`.
- Network error → toast `לא הצלחנו לשמור. בדקו חיבור ונסו שוב.` Button restored.
- Validation error from server (409 conflict — e.g., another device wrote first) → toast `הלו"ז עודכן על־ידי מכשיר אחר. רענון...`  auto-reload.

---

## B) Education Levels Sub-Step

**Position:** New screen rendered **as the second screen of ChildrenStep** (sub-step within the existing Children step) — appears automatically after user clicks המשך on the current ChildrenStep (where names + birthdates are entered). We do NOT add a new top-level step to `STEP_TITLES`.

### B1 — Per-Child Framework Confirmation

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│           🎓 (GraduationCap icon tile)                      │
│            מסגרת חינוכית לכל ילד                            │
│  הייצוג הזה עוזר למערכת לזהות חופשות בית-ספר.               │
│                                                            │
│  ┌─ per-child row ────────────────────────────────────┐    │
│  │ יוסי (גיל 8)                                       │    │
│  │ מסגרת משוערת:  יסודי                               │    │
│  │ כיתה נוכחית:  [ ג׳ ▾ ]                             │    │
│  │ [ ✓ אשר / ✎ שנה מסגרת ]                           │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ נועה (גיל 14)                                     │    │
│  │ מסגרת משוערת:  חטיבה                              │    │
│  │ כיתה נוכחית:  [ ט׳ ▾ ]                            │    │
│  │ [ ✓ אשר ]                                        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ℹ בספטמבר הקרוב (1.9.2026) הכיתה תתקדם אוטומטית.          │
│                                                            │
│  [ חזור ]                                [ המשך ]          │
└────────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `מסגרת חינוכית לכל ילד`
- Sub: `הייצוג הזה עוזר למערכת לזהות חופשות בית-ספר.`
- Row labels: `מסגרת משוערת:` / `כיתה נוכחית:`
- Button (inline): `✓ אשר` (changes to `✓ מאושר` after confirm) / `✎ שנה מסגרת` (opens small popover with 4 options: `גן`, `יסודי`, `חטיבה`, `תיכון`)
- Info: `בספטמבר הקרוב (1.9.YYYY) הכיתה תתקדם אוטומטית.`

**Framework auto-calc from birth_date:**
- age 3–6 → `גן`
- age 6–12 → `יסודי` (grade א׳–ו׳)
- age 12–15 → `חטיבה` (grade ז׳–ט׳)
- age 15–18 → `תיכון` (grade י׳–יב׳)

**State when no birth_date:**
- Show child row greyed out with text `חסר תאריך לידה — חזרו למסך הקודם כדי להוסיף.`
- Button `חזרה לעריכת פרטי הילד/ה ←` (returns to ChildrenStep-1).
- `המשך` disabled for that specific child row until resolved OR user confirms explicit skip via `המשך בלי לסמן מסגרת` (makes framework=null for that child, warned once).

**Interaction:**
- Grade `<Select>` options: `גן חובה`, `א׳ … יב׳` (14 values mapped to `current_grade` integer 0..12).
- Clicking `שנה מסגרת` opens a popover with 4 pills, selecting one overrides the auto-calc and sets `education_framework_override=true`.
- `המשך` → writes `children.education_framework`, `children.current_grade`, `children.education_framework_override` then advances to BillingCycleStep.

**States:**
- Validation error from server → toast `לא הצלחנו לשמור את המסגרת. נסו שוב.`

**A11y:**
- Each row is a `<fieldset>` with `<legend>{child.name} (גיל {age})</legend>`.

---

## C) Settings — CustodyScheduleCard in `/account-settings` "account" tab

Added as a new card in the `account` TabsContent, between `BillingCycleCard` and `AvatarSetCard`.

### C1 — Collapsed View

**Layout:**
```
┌─ Card bg-card border border-border/50 ──────────────────┐
│  📅 הלו"ז שלי                              [ ערוך ▾ ]   │
│  ──────────────────────────────────────────────────── │
│  שבוע-שבוע · החלפה ב-18:00 · השבוע אצלי                │
└─────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Title: `הלו"ז שלי`
- Summary line: `{preset_label} · החלפה ב-{handoff_time} · השבוע {me|השני}`
- CTA: `ערוך` (chevron-down rotates to chevron-up on expand)

**Empty state** (no pattern yet): single-line message `עדיין לא הגדרת לו"ז` + button `הגדר עכשיו →` that opens the edit drawer (C3) directly at A1 content embedded.

### C2 — Expanded View

Triggered by clicking `ערוך ▾` → card expands in place (not a drawer).

**Layout:**
```
┌─ Card expanded ───────────────────────────────────────────┐
│  📅 הלו"ז שלי                                  [ ערוך ]   │
│  שבוע-שבוע · החלפה ב-18:00                               │
│  ────────────────────────────────────────────────────    │
│                                                           │
│  ◉ אצלי    ◉ אצל דנה    ◉ משותף    ◉ טרם שובץ           │
│                                                           │
│  4 שבועות הקרובים:                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [MonthGridMini — 4 rows × 7 cols]                │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  [ ✎ ערוך את הלו"ז שלי ]  [ 👁 הלו"ז של דנה ]            │
│                                                           │
│  ─────── audit line ─────────                            │
│  עודכן לאחרונה: 15.03.2026 · אני                         │
└───────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Legend: `אצלי` / `אצל {partner_name}` / `משותף` / `טרם שובץ`
- Sub-header: `4 שבועות הקרובים:`
- Buttons: `✎ ערוך את הלו"ז שלי` · `👁 הלו"ז של {partner_name}` (opens C4)
- Audit line: `עודכן לאחרונה: {date} · {editor_name}` (editor: `אני` or `דנה`)

**Interaction:**
- Clicking `✎ ערוך` opens the **Edit Drawer** (C3).
- Clicking `הלו"ז של דנה` opens the **read-only preview** (C4).
- Expanded state persists via URL hash `#custody` on the settings page.

### C3 — Edit Sheet/Drawer

**Primitive:** shadcn `Drawer` on mobile (bottom sheet), `Sheet` (right side) on desktop ≥768px. Max-width `640px`.

**Layout:**
```
┌─ Drawer header ────────────────────────────────────┐
│  עריכת הלו"ז שלי                           [ ✕ ]   │
└────────────────────────────────────────────────────┘
┌─ Tabs (shadcn Tabs, dir="rtl") ────────────────────┐
│ [ תבנית ] [ החלפה ] [ תחילה ] [ הורה שני ]          │
└────────────────────────────────────────────────────┘
┌─ Tab body (scrollable) ────────────────────────────┐
│                                                    │
│  (content varies per tab — same structure as A1-A5)│
│                                                    │
└────────────────────────────────────────────────────┘
┌─ Footer sticky ────────────────────────────────────┐
│  [ בטל ]                              [ שמור ]     │
└────────────────────────────────────────────────────┘
```

**Tabs:**
- `תבנית` — preset picker (same as A1) + custom grid if applicable. Changing preset shows inline warning: `שינוי התבנית יעדכן את כל התאריכים העתידיים מ-{today} והלאה. תאריכי עבר יישארו כפי שהם.`
- `החלפה` — time picker (same as A3).
- `תחילה` — start date + current week holder (same as A4). Hint: `שינוי כאן משנה איזה שבוע נחשב "שלי".`
- `הורה שני` — same as A5 but with additional states: if partner already joined, option 3 "virtual" becomes disabled with text `ההורה השני כבר הצטרף — אי-אפשר לחזור למצב וירטואלי.`

**Interaction:**
- `שמור` → fires RPC `upsert_custody_pattern` with same shape as onboarding. On success: drawer closes, card re-renders with fresh data. Toast: `הלו"ז עודכן`.
- `בטל` → dirty-check; if unsaved changes → confirm `לצאת בלי לשמור?` → [המשך עריכה] / [צא בלי לשמור].
- Esc key triggers same dirty-check.

**Focus management:**
- On open: focus first tab.
- On close (save or cancel): focus returns to `ערוך את הלו"ז שלי` button.

**Error states:**
- Network error: toast `שמירה נכשלה. נסו שוב.` + re-enable `שמור` button.
- Stale data (etag mismatch): inline banner at top of drawer: `הלו"ז עודכן במכשיר אחר. הנתונים נטענו מחדש.` + auto-reload of form values (losing local edits after a 3-second delay with countdown). Explicit button `טען מחדש עכשיו`.
- Permission denied (user isn't account admin/member somehow): disables all controls, banner: `אין לך הרשאה לערוך את הלו"ז. פנו למנהל/ת החשבון.`

### C4 — View Other Parent's Schedule (Read-Only)

**Primitive:** shadcn `Drawer` (mobile) / `Dialog` (desktop) opened from C2 button.

**Layout:**
```
┌────────────────────────────────────────┐
│  👁 הלו"ז של דנה                [ ✕ ]  │
│  תצוגה בלבד — לא ניתן לערוך              │
│  ────────────────────────────────────  │
│  תבנית:     שבוע-שבוע (משלים שלי)       │
│  העברה:     18:00                      │
│  השבוע:     אצלה                       │
│  4 שבועות הקרובים:                     │
│  [MonthGridMini in amber/teal]         │
│                                         │
│           [ סגור ]                     │
└────────────────────────────────────────┘
```

**Microcopy:**
- Title: `הלו"ז של {partner_name}`
- Sub: `תצוגה בלבד — לא ניתן לערוך`
- Template description note: `שבוע-שבוע (משלים שלי)` — always shows the word `משלים` when partner's pattern is derived from user's own.

**Interaction:**
- Read-only — no editable controls.
- If `partnerMode === 'virtual'`, the sub-line becomes `זו הגדרה זמנית עבור {partner_name}. היא יכולה לשנות כשתצטרף.` and CTA changes to `✎ ערוך את הלו"ז של {partner_name}` (opens C5).

### C5 — Edit Other Parent's Schedule (virtual only)

**Layout:** Same as C3 but:
- Drawer title: `עריכת הלו"ז של {partner_name} (בשמה)`
- Persistent ribbon at top of drawer: `את/ה עורך/ת בשם {partner_name}. כשתצטרף תתבקש לאשר את ההגדרות.`
- Save toast: `הלו"ז של {partner_name} עודכן. תקבל אישור כשתצטרף.`

**Permission check:** only shown when `custody_patterns.owner_user_id = virtual_user_id` AND `virtual_users.claimed_at IS NULL`. If partner has joined, this entire mode disappears.

---

## D) Main Calendar Page (`/custody-calendar` refactor)

Replaces the current CustodyTable-driven UI. New component: `CustodyCalendarView`.

### D1 — Month Grid (Desktop default)

**Layout:**
```
┌─ Page container max-w-7xl mx-auto ───────────────────────────────┐
│                                                                  │
│  📅 הלו"ז שלי · אפריל 2026                 [ ← ] [ היום ] [ → ] │
│  {account.name}                                                  │
│                                                                  │
│  ┌─ Action bar ────────────────────────────────────────────┐     │
│  │ [ ✎ הלו"ז שלי ]  [ 🎉 טען חגי תשפ"ו ] [ 📤 iCal ] [ ≡ ] │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─ Legend strip ─────────────────────────────────────────┐      │
│  │ ◧ אצלי  ◧ אצל דנה  ◨ משותף  ◇ טרם שובץ  ⚠ קונפליקט    │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌─ Month grid ──────────────────────────────────────────┐       │
│  │  א׳   ב׳   ג׳   ד׳   ה׳   ו׳   ש׳                    │       │
│  │  ─    ─    1    2    3    4    5                      │       │
│  │  6    7    8    9    10   11   12                     │       │
│  │  13   14   15   16   17   18   19                     │       │
│  │  20   21   22   23   24   25   26                     │       │
│  │  27   28   29   30   ─    ─    ─                      │       │
│  │                                                        │       │
│  │  Each cell: colored background, small day number top, │       │
│  │  under it: dot markers (🏖 vacation, 🕎 holiday,       │       │
│  │  ⚠ conflict). Tap/click → D3 popover.                  │       │
│  └────────────────────────────────────────────────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Cell rendering (J4):**
- Parent A day: `bg-primary/10`, left border `border-r-4 border-primary`.
- Parent B day: `bg-accent/10`, `border-r-4 border-accent`.
- Shared: diagonal CSS `linear-gradient(135deg, primary/15 50%, accent/15 50%)`.
- Unassigned: `border-dashed border-muted-foreground/40`.
- Conflict: outer `ring-2 ring-destructive/60`.
- Historical edit: small `שונה` pill in top-left of cell.
- Today: `ring-2 ring-foreground/30`.
- Selected: `ring-2 ring-primary`.

**Microcopy:**
- Page title (header): `הלו"ז שלי` + date range of visible month
- Nav buttons: `←` / `היום` / `→`
- Action bar:
  - `✎ הלו"ז שלי` (opens Settings C3 in a modal, or navigates to settings)
  - `🎉 טען חגי {hebrew_year}` — where `{hebrew_year}` is computed from current school year (e.g., `תשפ"ו`)
  - `📤 iCal` (hover tooltip: `ייצוא ליומן חיצוני`)
  - `≡` — opens filter drawer (D4 details)
- Legend text: `אצלי` / `אצל {partner_name}` / `משותף` / `טרם שובץ` / `קונפליקט`

**Keyboard shortcuts (desktop):**
- `N` → open "create exception" dialog for the currently selected day (see F1 entry point).
- `E` → open day-edit for selected day.
- `←` `→` → move day selection by 1.
- `↑` `↓` → move day selection by 7.
- `PgUp` `PgDn` → previous/next month.
- `T` or `Home` → jump to today.
- `?` → opens a `Dialog` listing all shortcuts.

**Data loading:**
- On mount: fetch `custody_pattern` + `custody_exceptions` for ±3 months.
- On month nav: pre-fetch adjacent months.
- Loading state: grid cells show `bg-muted/40 animate-pulse`, header icons use spinner.

### D2 — Week Grid (Mobile default)

**Layout:**
```
┌─ Page container ─────────────────────────┐
│  📅 הלו"ז שלי                  [≡] [...] │
│  שבוע 26.4 – 2.5.2026        [←] [היום] [→]│
│                                          │
│  ┌─ vertical list ──────────────────┐    │
│  │ יום א׳   26/4                    │    │
│  │  ◧ אצלי · 18:00 העברה            │    │
│  ├────────────────────────────────┤     │
│  │ יום ב׳   27/4  🎉 חג הפסח        │    │
│  │  ◨ משותף                         │    │
│  ├────────────────────────────────┤     │
│  │ יום ג׳   28/4                    │    │
│  │  ◧ אצל דנה                        │    │
│  │  ⚠ קונפליקט                      │    │
│  ├────────────────────────────────┤     │
│  │  ...                             │    │
│  └────────────────────────────────┘     │
│                                          │
│  FAB [ + חריגה / החלפה ] bottom-left    │
└──────────────────────────────────────────┘
```

**Microcopy:**
- Week header: `שבוע {start_date} – {end_date}`
- Per-day line: `{weekday} {day/month}` + event badges
- Parent chip: `אצלי` / `אצל {partner}` / `משותף` / `טרם שובץ`
- Handoff line: `{time} העברה` (only on switching days)

**Mobile gestures:**
- Swipe left/right on a row → reveals actions: `[ החלף ]`, `[ חריגה ]` (red background means delete exception).
- Long-press on row → enters multi-select; row gets a checkbox; action bar appears at top: `{n} נבחרו` + `[ בטל ] [ הקצה ל...▾ ]`.
- Swipe down at top of grid → pull-to-refresh (fetches latest server state). Toast `מעודכן`.
- Swipe horizontally across whole view → navigate weeks.

### D3 — Day Detail Popover/Sheet

**Primitive:** `Popover` on desktop (anchored to cell), `Sheet` from bottom on mobile.

**Layout:**
```
┌─────────────────────────────────────┐
│  יום שלישי · 28 באפריל 2026  [ ✕ ] │
│  ─────────────────────────────────  │
│  🧑 אצל דנה                         │
│  🕕 העברה: 18:00                    │
│                                     │
│  🎉 חג הפסח (חופשה בית-ספר)         │
│                                     │
│  הערה של דנה:                       │
│   "לוקחת אותם לכינרת"                │
│                                     │
│  ─────────────────────────────────  │
│  [ 🔄 בקש החלפה ]  [ ✎ חריגה ליום ] │
│                                     │
│  audit (if edited):                 │
│  [ 🏷 שונה ] — ראה היסטוריה          │
└─────────────────────────────────────┘
```

**Microcopy:**
- Heading: `{hebrew_weekday} · {day} ב{hebrew_month} {year}`
- Parent line: `אצל {name}` or `אצלי` or `משותף — {name_a} ו-{name_b}` or `טרם שובץ`
- Handoff: `העברה: {time}` (only for handoff days)
- School event (if any): `{event_name} ({kind_he})` where `kind_he`:
  - `holiday` → `חג`
  - `vacation` → `חופשה בית-ספר`
  - `irregular` → `יום מיוחד`
- Note section: `הערה של {author_name}:` + italic text; placeholder if none: `אין הערה`
- Actions:
  - `🔄 בקש החלפה` → opens F1 flow with this day pre-filled
  - `✎ חריגה ליום` → opens a mini-form inline: allows changing parent / handoff time / note / school event kind for just this date
  - `🏷 שונה` → opens audit timeline dialog (G2 expanded)

**Edge cases:**
- Day >30 days ago: `[ חריגה ליום ]` button replaced with disabled state + explainer `לא ניתן לערוך תאריכים ישנים מ-30 יום`. See G3.
- Conflict day: top of popover shows a `Alert variant="destructive"` with text `⚠ {partner_name} רשום/ה באותו יום. [ לפתור קונפליקט ]`.

**Focus management:**
- On open: focus moves to popover close button or first action.
- On close: focus returns to the originating day cell.
- Trap tab within popover.

**A11y:**
- Popover `role="dialog"` `aria-labelledby="day-detail-title"`.

### D4 — Page Header (actions + filters drawer)

The `[≡]` button on both mobile and desktop opens a filters drawer.

**Filters drawer layout:**
```
┌─ מסננים                                [ ✕ ]   ┐
│  ─────────                                      │
│  הורה                                           │
│  [ כולם ▾ ]  (כולם / אצלי / אצל דנה / משותף / טרם שובץ)│
│                                                 │
│  אירועי בית־ספר                                  │
│  ☑ חגי ישראל                                    │
│  ☑ חופשות בית-ספר                               │
│  ☐ ימים מיוחדים (בלתי רגיל)                      │
│                                                 │
│  ילדים                                          │
│  ☑ יוסי ☑ נועה                                 │
│                                                 │
│  [ איפוס ]                          [ החל ]     │
└─────────────────────────────────────────────────┘
```

**Microcopy / actions:**
- Title: `מסננים`
- Section labels: `הורה` / `אירועי בית־ספר` / `ילדים`
- Footer: `איפוס` / `החל`

**Header actions (reiterated):**
- `✎ הלו"ז שלי` → links to `/account-settings?tab=account#custody` (or opens C3 as dialog)
- `🎉 טען חגי {שנה_עברית}` → full-width on mobile, fetches Hebcal + admin vacation JSON, preview dialog (shows X events to add, collapsible list), confirm button `אישור — הוסף לשנה`. Toast on success: `נוספו {X} אירועים · {Y} חגים · {Z} חופשות בית-ספר`.
- `📤 iCal` → downloads .ics (existing impl preserved).

### D5 — Empty State (no pattern yet)

**Layout:**
```
┌─ Centered card bg-card border border-dashed max-w-md ──┐
│                                                        │
│             🏠  (Home-heart SVG, 64px)                  │
│                                                        │
│          עדיין לא הגדרת לו"ז                           │
│  כדי לראות מי עם הילדים בכל יום, הגדר תבנית שבועית.    │
│                                                        │
│          [ ✨ הגדר את הלו"ז שלי ]                       │
│                                                        │
│     או                                                 │
│                                                        │
│  [ 🎉 רק תטען חגים וחופשות לשנה ]                       │
└────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `עדיין לא הגדרת לו"ז`
- Sub: `כדי לראות מי עם הילדים בכל יום, הגדר תבנית שבועית.`
- Primary: `✨ הגדר את הלו"ז שלי` → opens C3 drawer directly on "תבנית" tab
- Secondary: `🎉 רק תטען חגים וחופשות לשנה` → fires the same action as header button; allows using the page as read-only holiday calendar

### D6 — Single-Parent State

When `partnerMode === 'solo'`:
- Legend strip shows only `אצלי` · `אירועי בית־ספר`.
- Day cells never show amber / diagonal.
- `[ הלו"ז של דנה ]` button hidden everywhere.
- Conflict banner / badge never appear.
- D3 popover: no `[ בקש החלפה ]`. Only `[ ✎ חריגה ליום ]`.
- Day color is always teal for days assigned to user, grey/dashed for unassigned.

---

## E) Conflict Resolution Flow

**Definition of conflict:** Same date is claimed by both parents (either via pattern overlap + exception, or both have exceptions mis-matching).

### E1 — Conflict Banner in Calendar Header

**Layout (top of calendar page, between header and month grid):**
```
┌─ Alert destructive/20 bg-destructive/5 ─────────────────┐
│ ⚠  יש {N} התנגשויות בלו"ז                             │
│    שני ההורים רשומים באותם ימים. צריך להסכים על פתרון.  │
│                                             [ פתור → ]  │
└─────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `יש {N} התנגשויות בלו"ז`
- Sub: `שני ההורים רשומים באותם ימים. צריך להסכים על פתרון.`
- CTA: `פתור →` → opens a list dialog of all conflicts, each click drills into E3.

### E2 — Row-Level Conflict Badge

On day cell: small triangle icon + `⚠` in top-right corner, with `ring-2 ring-destructive/60`. Hover tooltip: `התנגשות — לחץ לפרטים`.

On D3 popover for that day: destructive Alert (as noted in D3 edge cases).

### E3 — Conflict Detail Bottom Sheet

**Primitive:** shadcn `Sheet` from bottom (mobile and desktop).

**Layout:**
```
┌─ התנגשות ביום שלישי, 28.4.2026              [ ✕ ] ─┐
│                                                    │
│  ┌─ claim A teal border-r-4 ──┐ ┌─ claim B amber ┐│
│  │ אצלי (ארז)                 │ │ אצל דנה         ││
│  │ לפי התבנית "שבוע-שבוע"     │ │ לפי חריגה שהגדרה ││
│  │ נוצר: 15.2.2026            │ │ נוצר: 20.4.2026  ││
│  │ הערה: —                    │ │ הערה: "ביום הזה ││
│  │                            │ │  אני לוקחת לחוף"││
│  └────────────────────────────┘ └──────────────────┘│
│                                                    │
│  ────────────────────────────────────────          │
│  ? איך לפתור?                                      │
│                                                    │
│  [ ◯ נשאר אצלי              ]                      │
│  [ ◯ עובר לדנה              ]                      │
│  [ ◯ הצע החלפה (יום תמורה)   ]                    │
│                                                    │
│  ℹ כל החלטה צריכה אישור של ההורה השני.              │
│                                                    │
│  [ ביטול ]                    [ שלח הצעה ]         │
└────────────────────────────────────────────────────┘
```

**Microcopy:**
- Title: `התנגשות ביום {weekday}, {date}`
- Claim card headings: `אצלי ({my_name})` / `אצל {partner_name}`
- Source line: `לפי {source_description}` where source is either `התבנית "{preset_label}"` or `חריגה שהגדרה ב-{date}`
- Creation line: `נוצר: {date}`
- Note: `הערה: {text}` or `—`
- Divider heading: `? איך לפתור?`
- Options:
  - `נשאר אצלי` — my claim wins
  - `עובר ל{partner_name}` — their claim wins
  - `הצע החלפה (יום תמורה)` — opens inline sub-form to pick a counter-day
- Info: `כל החלטה צריכה אישור של ההורה השני.`
- CTAs: `ביטול` / `שלח הצעה`

**When "הצע החלפה" is selected:**
- Sub-form slides in, with date picker `בחר יום להחלפה`, optional note field `הסבר (לא חובה)` placeholder `למשל: "אני רוצה אותם בסוף שבוע אחר במקום"`.

**Interaction:**
- `שלח הצעה` → RPC `propose_conflict_resolution`, closes sheet, toast: `ההצעה נשלחה ל{partner_name}. נחכה לאישור.`
- Pushes notification (E4) to partner.

**Error states:**
- Network error: toast `לא הצלחנו לשלוח. נסו שוב בעוד רגע.` Sheet stays open.
- Conflict already resolved by partner while user was viewing: top of sheet shows `Alert` `⚠ {partner_name} כבר פתרה את ההתנגשות. הצעתך לא נשלחה.` + button `הצג פתרון חדש` (fetches + re-renders).

### E4 — Notification to Partner

**Sent via existing notifications system** (`notifications` table + NotificationsCard).

**Notification payload:**
```
type: 'custody_conflict_resolution_proposed'
title: 'הצעת פתרון להתנגשות בלו"ז'
body: '{proposer_name} ביקש/ה לפתור התנגשות ביום {weekday} {date}.'
deep_link: '/custody-calendar?resolve={resolution_id}'
cta_label: 'ראה והחלט'
```

### E5 — Confirmation Screen for Other Parent

Opened from deep link → full-screen modal (shadcn `Dialog` `max-w-lg`).

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  {proposer_name} ביקשה שינוי                             │
│                                                          │
│  התנגשות ביום שלישי, 28.4.2026                           │
│                                                          │
│  ┌─ Box ──────────────────────────────────────┐          │
│  │ ההצעה של {proposer_name}:                 │          │
│  │                                             │          │
│  │ "היום הזה ישאר אצלי. ב-5.5 אני אחליף ואעביר │         │
│  │  אותו אליך במקום."                         │          │
│  │                                             │          │
│  │  משמעות:                                    │          │
│  │   • 28.4 — {proposer_name}                 │          │
│  │   • 5.5  — {you}                           │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  [ דחייה ]  [ הצע פתרון אחר ]     [ אשר שינוי ]           │
│                                                          │
│  ℹ אם לא תגיב/י תוך 7 ימים, ההצעה תפוג.                   │
└──────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `{proposer_name} ביקשה שינוי`
- Day-line: `התנגשות ביום {weekday}, {date}`
- Proposal box title: `ההצעה של {proposer_name}:`
- Note (if any) in quotes; else `—`
- "משמעות:" section lists the dates + who gets each.
- Buttons:
  - `אשר שינוי` (primary teal) → RPC `accept_conflict_resolution`. Toast `שינוי אושר. הלו"ז עודכן.` Notification fires back to proposer.
  - `הצע פתרון אחר` → opens E3 for this conflict with the current proposal greyed out.
  - `דחייה` → confirm dialog `לדחות את ההצעה?` → on confirm, RPC `reject_conflict_resolution`. Toast: `ההצעה נדחתה. {proposer_name} תקבל התראה.`
- Footer hint: `אם לא תגיב/י תוך 7 ימים, ההצעה תפוג.`

---

## F) Swap / Exception Request Flow

### F1 — "Request Swap" Entry Point

Triggered from D3 "בקש החלפה" button.

**Step 1 sheet:**
```
┌─ החלפת יום                              [ ✕ ] ┐
│ ────────────────────────────────────────────  │
│  יום שלישי, 28.4.2026 — אצלך                  │
│                                                │
│  אחרי ההחלפה:                                  │
│  • 28.4 — {partner}                            │
│  • יום התמורה — אצלך                           │
│                                                │
│  בחר/י יום תמורה:                              │
│  [ Calendar picker mode="single" he locale ]  │
│                                                │
│  ℹ אפשר לבחור רק ימים שהם כרגע אצל {partner}.  │
│                                                │
│  [ ביטול ]                        [ המשך ]     │
└────────────────────────────────────────────────┘
```

**Microcopy:**
- Title: `החלפת יום`
- Source day line: `יום {weekday}, {date} — אצלך`
- Sub-title: `אחרי ההחלפה:`
- Calendar label: `בחר/י יום תמורה:`
- Info: `אפשר לבחור רק ימים שהם כרגע אצל {partner}.`

**Validation:**
- Counter-day must be assigned to the other parent currently (otherwise nothing to swap).
- Counter-day must be within ±60 days from source day.
- Cannot be same date as source.

**Calendar picker:** disables days that don't qualify (show with `opacity-30` and tooltip `לא ניתן להחלפה`).

### F2 — Pick Counter-Day

Combined into F1 (single sheet). Once date picked, "המשך" enabled → moves to F3 (note step) without closing.

### F3 — Add Note + Send

**Step 2 (replaces body of same sheet):**
```
│  החלפה:                                        │
│  • 28.4 ↔ 5.5                                 │
│                                                │
│  הוסף/י הערה (לא חובה):                        │
│  [ Textarea, 200 chars, placeholder:          │
│    "למשל: יש לי חופש בעבודה ואני רוצה ליום... │
│     "                                         ]│
│                                                │
│  [ חזור ]                  [ שלח ל{partner} ]  │
```

**Microcopy:**
- Summary: `החלפה: • {date_a} ↔ {date_b}`
- Note label: `הוסף/י הערה (לא חובה):`
- Placeholder: `למשל: יש לי חופש בעבודה ואני רוצה ליום הזה`
- CTA: `שלח ל{partner_name}`

**On send:**
- RPC `propose_day_swap(from_date, to_date, note)`.
- Toast: `הבקשה נשלחה ל{partner_name}.`
- Sheet closes.
- Day cells now show small clock-icon `⏳` with tooltip `ממתין לאישור החלפה`.

### F4 — Recipient's View

Notification identical pattern to E4:
- Title: `בקשת החלפה מ{proposer_name}`
- Body: `{proposer} מבקש/ת להחליף {date_a} ↔ {date_b}.`
- Deep link opens confirmation modal:

```
┌──────────────────────────────────────────────┐
│  בקשת החלפה מ{proposer_name}                 │
│                                              │
│  {proposer} רוצה להחליף:                     │
│   • {date_a} — עובר אליה/אליו               │
│   • {date_b} — עובר אליך                     │
│                                              │
│  הערה: "..."   (or: אין הערה)                │
│                                              │
│  [ דחייה ]  [ הצע תאריך אחר ]  [ אשר ]        │
└──────────────────────────────────────────────┘
```

**Microcopy:**
- Header: `בקשת החלפה מ{proposer_name}`
- Options explanation: list 2 bullet lines.
- Buttons:
  - `אשר` → toast `אושר. הלו"ז עודכן בשני הצדדים.` + 2 `custody_exceptions` rows inserted + audit entries.
  - `הצע תאריך אחר` → opens F1 in edit mode for the same from-date but allows changing the to-date.
  - `דחייה` → toast `ההחלפה נדחתה. {proposer_name} מקבל/ת התראה.`

### F5 — Audit Entry After Approval

After approval, **both days** get a `שונה` badge. Clicking the badge opens the audit timeline:

```
┌─ היסטוריית יום שלישי 28.4.2026   [ ✕ ] ┐
│  ────────────────────────────────────  │
│  ● 28.4.2026 · 14:23 · אושר             │
│    החלפה: עבר מ{A} ל{B}                 │
│    מי אישר: {B}                         │
│                                         │
│  ● 27.4.2026 · 09:12 · הוצע              │
│    {A} ביקש/ה החלפה עם 5.5              │
│                                         │
│  ● 15.2.2026 · 00:00 · נוצר              │
│    לפי התבנית "שבוע-שבוע"               │
└─────────────────────────────────────────┘
```

Each row has timestamp, action verb (in Hebrew past tense: `אושר`, `הוצע`, `נוצר`, `בוטל`, `נדחה`), and actor name.

---

## G) Historical Edit (past event within 30 days)

### G1 — Edit a Past Day — Confirmation Modal

Triggered when user clicks `✎ חריגה ליום` on a day whose date < today.

```
┌─ עריכת העבר                                     ┐
│                                                  │
│     ⚠  אתה עורך/ת יום שכבר חלף                  │
│                                                  │
│  {weekday} {date} — לפני {X} ימים                │
│                                                  │
│  שינוי יתועד ויישלח התראה ל{partner_name}.       │
│  ההורה השני יוכל לראות את הלפני/אחרי והמבצע.    │
│                                                  │
│  [ ביטול ]                     [ המשך עריכה ]    │
└──────────────────────────────────────────────────┘
```

**Microcopy:**
- Title: `עריכת העבר`
- Warning: `⚠ אתה עורך/ת יום שכבר חלף`
- Day line: `{weekday} {date} — לפני {X} ימים`
- Explainer: `שינוי יתועד ויישלח התראה ל{partner_name}. ההורה השני יוכל לראות את הלפני/אחרי והמבצע.`
- Buttons: `ביטול` / `המשך עריכה`

**Interaction:**
- Confirm → opens standard day-edit sheet (same as future edit) but with `Alert` pinned at top of sheet: `עריכה היסטורית — כל שינוי יתועד`.
- On save → audit row with `edit_type='historical'` + notification to partner.

### G2 — Audit Badge on Edited Day

On any day with an audit entry where `edit_type IN ('historical','swap','conflict_resolution')`:

**Visual:** Small pill top-left of cell: `🏷 שונה` with `text-[10px] bg-warning/20 text-warning-foreground`.

**Tooltip on hover (desktop):**
```
עודכן 15.4.2026 · ארז
לפני: אצל דנה
אחרי: אצלי + הערה
```

**Click anywhere on badge → full audit dialog** (same component as F5 timeline).

### G3 — Blocked State (>30 days)

When user tries to edit a day >30 days ago:

- The "חריגה ליום" button in D3 is visually disabled (opacity-50, no hover).
- Clicking it still triggers a tooltip/toast:

```
[ Alert Variant="secondary" inside D3 popover ]
 ℹ  לא ניתן לערוך תאריכים ישנים מ-30 יום.
   הנתון ההיסטורי נשאר כפי שהוא לשקיפות.
```

**If user tries via keyboard shortcut `E`:** toast `עריכה מעל 30 יום אחורה חסומה.`

**For admin users:** same block applies. No override (this is a product-level lock, not a permission).

---

## H) Virtual Partner Flow

### H1 — Account-Level Toggle (top of CustodyScheduleCard)

**Visible only when `partnerMode === 'virtual'`.**

```
┌─ CustodyScheduleCard header ────────────────────┐
│  📅 הלו"ז שלי                                  │
│                                                 │
│  ┌─ Toggle-row bg-muted/40 rounded-lg ──────┐  │
│  │  עורך/ת בשם:                             │  │
│  │  [ ● אני (ארז) ]  [ ○ דנה (וירטואלית) ]   │  │
│  └──────────────────────────────────────────┘  │
│  ...
```

**Microcopy:**
- Label: `עורך/ת בשם:`
- Options: `אני ({my_name})` · `{partner_name} (וירטואלית)`
- When switched to "דנה (וירטואלית)": card content shifts to C5 mode; entire card gets subtle `ring-1 ring-accent/40` to remind user of impersonation context.

**Interaction:**
- Toggle persists in URL `?editAs=virtual` so refresh keeps mode.
- Switching shows toast: `עברת למצב עריכה בשם {partner_name}. שינויים יישמרו בלו"ז שלה.`

### H2 — Persistent Ribbon (when virtual partner exists)

Thin banner, top of `/custody-calendar` page, below main header, above Legend:

```
┌─ ribbon bg-accent/10 border-b border-accent/30 ──────────────┐
│ 🏷 {partner_name} עדיין לא הצטרפה. את/ה מנהל/ת את הלו"ז שלה. │
│                                          [ הזמן/י לחשבון ➤ ] │
└──────────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Main line: `{partner_name} עדיין לא הצטרפה. את/ה מנהל/ת את הלו"ז שלה.`
- CTA: `הזמן/י לחשבון ➤` (opens InviteUserForm dialog)

**Dismissible?** No — stays until partner joins or is removed.

### H3 — Consent Wall (partner signs up)

When a virtual partner user first authenticates, BEFORE they can see any page, show **blocking full-screen modal**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    👋  ברוכה הבאה, {name}                    │
│                                                             │
│         {inviter_name} הכין/ה עבורך לו"ז ראשוני.            │
│          אישור השהייה אצלך יעזור לכם להתחיל.                │
│                                                             │
│  ┌─ Summary ─────────────────────────────────────────┐     │
│  │ תבנית:     שבוע-שבוע (משלים את ארז)                │     │
│  │ שעת העברה: 18:00                                   │     │
│  │ השבוע:     אצל ארז                                 │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  תצוגה מקדימה — 4 שבועות הקרובים:                            │
│  [MonthGridMini 4 weeks]                                    │
│                                                             │
│  [ ✎ אני רוצה לשנות ]                      [ ✓ מאשרת ]      │
│                                                             │
│  ℹ אפשר לשנות כל פרט גם אחר-כך בהגדרות.                      │
└─────────────────────────────────────────────────────────────┘
```

**Microcopy:**
- Greeting: `ברוכה הבאה, {name}`
- Main: `{inviter_name} הכין/ה עבורך לו"ז ראשוני. אישור השהייה אצלך יעזור לכם להתחיל.`
- Summary heading + rows (same as C2 summary).
- Secondary: `✎ אני רוצה לשנות` → takes them straight to C3 drawer.
- Primary: `✓ מאשרת`
- Footer hint: `אפשר לשנות כל פרט גם אחר-כך בהגדרות.`

**Interaction:**
- `✓ מאשרת` → RPC `confirm_inherited_custody_pattern`, clears virtual flag, updates ownership of `custody_patterns` from virtual_user to real user. Toast: `אישרת. הלו"ז שלך מוכן.`
- `✎ אני רוצה לשנות` → opens C3 directly. After save, consent wall auto-closes (save IS implicit confirmation).
- Modal is **non-dismissible** — no X, no Esc, no outside-click close. User must either confirm or change.
- Cannot navigate to any other page until resolved.

**States:**
- Loading (fetching inherited pattern): skeleton rows + disabled buttons.
- Error (pattern missing — edge case): error state `לא מצאנו לו"ז מוגדר עבורך. [ ← חזור להתחלה ]` which puts them into normal onboarding A1.

---

## I) Admin Panel — `/admin/school-calendar`

Visible only to admins (RLS + route guard via `is_account_admin` RPC reused).

### I1 — List of Years

**Layout:**
```
┌─ Page header ────────────────────────────────────────┐
│  🎓 לוח חופשות בית-ספר (מנהל)                         │
│  תחזוקה של תאריכי החופשות לכל שנת-לימודים             │
│                                                      │
│  [ + ייבא שנה חדשה ]                 [ סינון / חיפוש ]│
└──────────────────────────────────────────────────────┘

┌─ Table ─────────────────────────────────────────────┐
│  שנה       |  אירועים |  סטטוס    |  עודכן לאחרונה │
│  ─────────|─────────|──────────|─────────────────│
│  תשפ"ו 2026│   42     │ ✅ מאומת   │  12.3.2026 ‒ אני│
│  תשפ"ז 2027│   38     │ ⏳ ממתין   │  1.4.2026 ‒ auto │
│  תשפ"ה 2025│   41     │ ✅ מאומת   │  15.8.2025      │
│  ─────────|─────────|──────────|─────────────────│
│                                                    │
│  [ ⋯ פעולות ] per row: "פתח" / "שכפל" / "מחק"      │
└────────────────────────────────────────────────────┘
```

**Microcopy:**
- Title: `לוח חופשות בית-ספר (מנהל)`
- Sub: `תחזוקה של תאריכי החופשות לכל שנת-לימודים`
- Columns: `שנה` / `אירועים` / `סטטוס` / `עודכן לאחרונה`
- Status values:
  - `✅ מאומת` (`verified`)
  - `⏳ ממתין לאימות` (`pending verification`)
  - `🔄 נטען אוטומטית` (`auto loaded, not yet reviewed`)
  - `⚠ חסר הוח חופשות` (`missing half-days`)
- Row actions: `פתח` / `שכפל משנה קודמת` / `מחק`
- Last-updated cell: `{date} · {author_name}` (`auto` if system-imported)

### I2 — Import New Year

Clicking `+ ייבא שנה חדשה` opens a wizard dialog:

**Step 1:** Pick year
```
┌─ ייבא שנה חדשה ─────────────────────────┐
│  בחר/י שנת לימודים:                      │
│  [ תשפ"ז (ספט 2026 – אוג 2027) ▾ ]       │
│                                         │
│  מקור ראשוני:                           │
│  ◉ קובץ JSON של משרד החינוך              │
│  ○ שכפל משנה קודמת                       │
│  ○ ריק (אגדיר ידנית)                    │
│                                         │
│  [ ביטול ]                [ המשך ]      │
└──────────────────────────────────────────┘
```

**Step 2 (if JSON):** file drop-zone
- Accepts `.json` or paste URL
- Client-side validator checks schema
- Preview: `יובאו {N} אירועים · {X} חגים · {Y} חופשות · {Z} ימים מיוחדים`
- If validation fails → inline errors listed with line numbers.

**Step 3:** confirm → insert rows into `school_calendar_events` with `status='pending_verification'`.

### I3 — Event List Per Year

Clicking a year row opens a new page `/admin/school-calendar/:year`.

**Layout:**
```
┌─ Header ────────────────────────────────────────┐
│  ← חזור | תשפ"ו 2026                            │
│  42 אירועים | סטטוס: ⏳ ממתין לאימות              │
│  [ אישור מלא ✓ ]  [ ייצוא JSON ]  [ + אירוע ]    │
└──────────────────────────────────────────────────┘

┌─ Filters bar ────────────────────────────────────┐
│  מסגרת: [ הכל ▾ ]  (הכל/גן/יסודי/חטיבה/תיכון)     │
│  סוג:   [ הכל ▾ ]  (חג/חופשה/יום מיוחד)           │
│  חיפוש: [ ____________ ]                        │
└──────────────────────────────────────────────────┘

┌─ Table ──────────────────────────────────────────┐
│ ☐ | תאריכים      | שם         | סוג   | מסגרות | מקור   | אימות│
│ ──|──────────── |──────────── |───── |────── |─────── |─── │
│ ☐ | 1.9 – 15.9  | ראש השנה   | חג   | הכל    | Hebcal | ✓  │
│ ☐ | 23.9        | יום כיפור  | חג   | הכל    | Hebcal | ✓  │
│ ☐ | 28.3 – 14.4 | חופשת פסח  | חופשה| יסודי, חט.| admin| ⏳  │
│ ... │
└──────────────────────────────────────────────────┘
```

**Microcopy:**
- Columns: `תאריכים` / `שם` / `סוג` / `מסגרות` / `מקור` / `אימות`
- Sources: `Hebcal` / `admin` / `ministry`
- Bulk action bar (appears when rows selected): `{n} נבחרו` + `[ אשר ]` `[ מחק ]` `[ שנה מסגרת ]`
- `אישור מלא ✓` button: one-click marks entire year verified. Confirm dialog `לאשר את כל {N} האירועים? לא תוכל לערוך סטטוס "ממתין" אחר-כך.` → `[ אשר הכל ] [ ביטול ]`

### I4 — Row Edit Modal

Double-click row or click edit icon.

**Layout:**
```
┌─ עריכת אירוע ─────────────────────────────────────┐
│  שם (עברית)*                                      │
│  [ ראש השנה                                 ]    │
│                                                  │
│  תאריך התחלה*         תאריך סיום*                │
│  [ 14.9.2026 ]        [ 15.9.2026 ]              │
│                                                  │
│  סוג*                                            │
│  ( חג · חופשה · יום מיוחד )                       │
│                                                  │
│  מסגרות (בחר לפחות אחת)*                         │
│  ☐ גן  ☐ יסודי  ☐ חטיבה  ☐ תיכון                │
│  [ ✓ הכל ]                                      │
│                                                  │
│  מקור*                                          │
│  ( Hebcal · משרד החינוך · ידני )                 │
│                                                  │
│  הערה פנימית (לא מוצג למשתמש)                    │
│  [ Textarea                             ]       │
│                                                  │
│  סטטוס אימות                                    │
│  ⏳ ממתין / ✅ מאומת  (toggle)                    │
│                                                  │
│  ─ אזהרות ───────────                           │
│  ⚠ חופפ ל"חופשת סוכות" (20.9 – 27.9)             │
│                                                  │
│  [ ביטול ]  [ מחק ]                [ שמור ]      │
└──────────────────────────────────────────────────┘
```

**Microcopy:**
- Labels as shown above. Required marked with `*`.
- Kind options: `חג` / `חופשה` / `יום מיוחד`
- Source options: `Hebcal` / `משרד החינוך` / `ידני`
- Status toggle: `⏳ ממתין` ↔ `✅ מאומת`
- Internal note placeholder: `הערה פנימית — רק מנהלים רואים`
- Warning section header: `אזהרות`
- Delete button confirm: `למחוק את "{name}"? פעולה זו אינה הפיכה.` → `[ ביטול ] [ מחק ]`

### I5 — Validation Warnings

Validation runs on load and on form edit. Warnings appear in `אזהרות` section and as inline row badges:

| Trigger | Hebrew message |
|---------|---------------|
| Event overlaps another event of same `applies_to` | `⚠ חופפ ל"{other_name}" ({dates})` |
| End date before start date | `⚠ תאריך סיום לפני תאריך התחלה` |
| Past date (end < today) on a new event | `⚠ האירוע כבר חלף` |
| No מסגרות selected | `⚠ בחר/י לפחות מסגרת חינוכית אחת` |
| Missing half-days in year (admin-configured rule) | `⚠ חסרים ימי חופש חלקיים בשנה הזו` (on year header) |
| Duplicate name in same year | `⚠ יש אירוע נוסף בשם "{name}" בשנה זו` |

Warnings block save only for hard errors (end<start, no frameworks). Soft warnings allow save with confirm: `יש אזהרות. לשמור בכל זאת?` → `[ לא ] [ כן, שמור ]`.

---

## J) Small Components

### J1 — PresetCard

**Props:** `preset: PresetId`, `selected: boolean`, `onSelect: () => void`, `starred?: boolean` (shows `הכי נפוץ` tag).

**Layout (128×140 px on desktop, flex on mobile):**
```
┌─ card border-2 rounded-xl p-3 ─────────┐
│   שבוע-שבוע       [⭐ הכי נפוץ]         │  ← top row
│   ────────────────────                  │
│                                         │
│   ● ● ● ● ● ● ●                         │  ← 7 dots/pills preview
│   ○ ○ ○ ○ ○ ○ ○                         │  ← (2 rows for 2-week presets)
│                                         │
│   שבוע אצלי, שבוע אצל ההורה השני        │  ← one-line desc, text-xs
└────────────────────────────────────────┘
```

**Per-preset preview:**
| Preset | Week 1 dots | Week 2 dots |
|--------|-------------|-------------|
| שבוע-שבוע | `●●●●●●●` | `○○○○○○○` |
| 2-2-3 | `●●○○●●●` | `○○●●○○○` |
| א'/ג'+סופ"ש | `●◐●◐●◐◐` alt weeks | visual alt weekend |
| ב'/ד'+סופ"ש | `◐●◐●◐●●` alt | — |
| ימות השבוע/סופ"ש | `●●●●●○○` | (same) |
| סופ"ש לסירוגין בלבד | `○○○○○○○` base + WE alt | mark |
| 3-4-4-3 | `●●●○○○○` | `○○○●●●●` |
| מותאם אישית | `✎` icon instead of dots + "סמן ידנית" |

**States:**
- Default: `border-border`.
- Hover: `border-primary/50`.
- Selected: `border-primary bg-primary/5 shadow-md` + checkmark top-right.
- Focused (keyboard): `ring-2 ring-primary ring-offset-2`.
- Disabled (e.g. custom disabled when edit-in-progress): `opacity-50 cursor-not-allowed`.

### J2 — WeekGrid Input

**Props:** `value: WeeklyPattern[]` (7 slots), `onChange`.

**Layout (desktop, 7 cols):**
```
┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐
│ א׳  ││ ב׳  ││ ג׳  ││ ד׳  ││ ה׳  ││ ו׳  ││ ש׳  │
│ אני ││השני ││ אני ││השני ││ אני ││משותף││משותף│
│(teal)││(amb)││(teal)││(amb)││(teal)││(split)││(split)│
└─────┘└─────┘└─────┘└─────┘└─────┘└─────┘└─────┘
```

**State visuals per pill:**
- `me`: `bg-primary/15 text-primary border border-primary/40`
- `other`: `bg-accent/15 text-accent border border-accent/40`
- `shared`: diagonal gradient + `border-dashed`

**Interaction:**
- Tap → cycle `me → other → shared → me`.
- Long-press / right-click → opens 3-option popover `[ אני ] [ השני ] [ משותף ]`.
- Keyboard: Tab to pill, `Space`/`Enter` to cycle, `1`/`2`/`3` hotkeys to jump to state.

### J3 — 14-Day Ribbon Preview

**Desktop:** 14 small cells in a row, each shows weekday abbreviation + day number + colored bg matching parent.

**Mobile <375px:** Shows only 7 days with horizontal swipe to see next 7. Dots indicator at bottom: `● ○`.

**Structure:**
```
┌────────────────────────────────────────────────────────┐
│ א  ב  ג  ד  ה  ו  ש  |  א  ב  ג  ד  ה  ו  ש            │
│ 26 27 28 29 30  1  2     3  4  5  6  7  8  9            │
│ ▉  ▉  ▉  ▉  ▉  ▉  ▉     ▣  ▣  ▣  ▣  ▣  ▣  ▣            │
└────────────────────────────────────────────────────────┘
  └─── שבוע נוכחי ───┘   └── שבוע הבא ──┘
```

**Sub-labels:** `שבוע נוכחי` / `שבוע הבא` under each 7-day block.

### J4 — Color-Coded Day Cell

4 variants in a single component `<DayCell variant="me|other|shared|unassigned" />`:

| Variant | Visual |
|--------|--------|
| `me` | `bg-primary/10 border-r-4 border-primary` |
| `other` | `bg-accent/10 border-r-4 border-accent` |
| `shared` | `bg-[linear-gradient(135deg,hsl(var(--primary)/.15)_50%,hsl(var(--accent)/.15)_50%)] border-r border-dashed border-foreground/30` |
| `unassigned` | `bg-muted/20 border border-dashed border-muted-foreground/40 text-muted-foreground` |

**Optional overlays:**
- Conflict: outer `ring-2 ring-destructive/60` + `⚠` absolute top-right.
- Audit: absolute top-left pill `שונה` (bg-warning).
- Today: inner `ring-2 ring-foreground/30`.
- School event: bottom-right small emoji icon (🕎 holiday, 🏖 vacation, ✨ irregular).

**A11y:** `role="gridcell"`, `aria-label="{weekday} {date}, {variant_label}"`. For screen readers: `{weekday} {date}, אצלי, יש חופשת פסח`.

### J5 — Hebrew Formatter Helpers

Added to `src/lib/hebrewDates.ts`:

```ts
formatDateWithYear(date: Date): string
// → '15 במרץ 2026'

formatWeekday(date: Date, abbrev?: boolean): string
// → 'יום שלישי' | 'ג׳'

formatSchoolYearHebrew(gregorianStart: number): string
// e.g. 2026 → 'תשפ"ו', 2027 → 'תשפ"ז'
// Covers תשפ"ה–תשפ"ח explicitly; fallback to algorithmic gematria.

formatDateRangeHebrew(start: Date, end: Date): string
// same day → '15 במרץ 2026'
// same month → '15–20 במרץ 2026'
// same year → '28 בפברואר – 5 במרץ 2026'
// cross-year → '28.12.2025 – 3.1.2026'

formatRelativeDaysAgo(date: Date): string
// → 'היום' | 'אתמול' | 'לפני 3 ימים' | 'לפני שבוע'

formatHandoffSummary(day: WeekDay, time: string): string
// → 'יום ראשון, 18:00'
```

---

## K) Toasts & System Messages (Inventory)

All via `sonner` toast. Type: `success | error | info | warning`.

| # | Trigger | Type | Hebrew text |
|---|---------|------|-------------|
| K1 | A6 save success | success | `הלו"ז נשמר בהצלחה` |
| K2 | A6 save network error | error | `לא הצלחנו לשמור. בדקו חיבור ונסו שוב.` |
| K3 | A6 save stale | warning | `הלו"ז עודכן על־ידי מכשיר אחר. רענון...` |
| K4 | C3 save success | success | `הלו"ז עודכן` |
| K5 | C3 save network error | error | `שמירה נכשלה. נסו שוב.` |
| K6 | C3 permission denied | error | `אין לך הרשאה לערוך את הלו"ז.` |
| K7 | C5 save (virtual) success | success | `הלו"ז של {partner_name} עודכן. תקבל אישור כשתצטרף.` |
| K8 | Load holidays success | success | `נוספו {X} אירועים · {Y} חגים · {Z} חופשות בית-ספר` |
| K9 | Load holidays — already loaded | info | `השנה הזו כבר טעונה. לא נוספו כפילויות.` |
| K10 | Load holidays error | error | `טעינת החגים נכשלה. נסו שוב.` |
| K11 | iCal export success | success | `היומן הורד. ניתן לייבא לגוגל/אפל קלנדר.` |
| K12 | Conflict resolution proposed | info | `ההצעה נשלחה ל{partner_name}. נחכה לאישור.` |
| K13 | Conflict resolution accepted (recipient) | success | `שינוי אושר. הלו"ז עודכן.` |
| K14 | Conflict resolution rejected (recipient) | info | `ההצעה נדחתה. {proposer_name} תקבל התראה.` |
| K15 | Conflict — already resolved externally | warning | `{partner_name} כבר פתרה את ההתנגשות. רענן...` |
| K16 | Swap request sent | success | `הבקשה נשלחה ל{partner_name}.` |
| K17 | Swap approved (recipient) | success | `אושר. הלו"ז עודכן בשני הצדדים.` |
| K18 | Swap rejected (recipient) | info | `ההחלפה נדחתה. {proposer_name} מקבל/ת התראה.` |
| K19 | Swap auto-expired (>7 days) | info | `בקשת ההחלפה פגה. אפשר לשלוח חדשה.` |
| K20 | Historical edit save | success | `השינוי ההיסטורי נשמר ודווח ל{partner_name}.` |
| K21 | Try edit >30 days ago | warning | `עריכה מעל 30 יום אחורה חסומה.` |
| K22 | Virtual partner mode enter | info | `עברת למצב עריכה בשם {partner_name}.` |
| K23 | Virtual partner consent approved | success | `אישרת. הלו"ז שלך מוכן.` |
| K24 | Virtual partner consent error | error | `לא הצלחנו לטעון את הלו"ז שהוגדר עבורך. נסו לרענן.` |
| K25 | Pattern changed (switched preset) | success | `התבנית עודכנה מ-{old} ל-{new}. תאריכי עבר נשמרו.` |
| K26 | Filters applied | info | `מציג {X} ימים מתוך {Y}.` |
| K27 | Pull-to-refresh complete | info | `מעודכן` |
| K28 | Partner joined (account-admin gets this) | success | `{partner_name} הצטרפה! הלו"ז שלה אושר.` |
| K29 | Invite sent (A5 option 2) | success | `הזמנה נשלחה ל-{email}.` |
| K30 | Invite send failed | error | `לא הצלחנו לשלוח הזמנה. בדקו את הכתובת.` |
| K31 | Admin: event saved | success | `האירוע נשמר.` |
| K32 | Admin: year verified | success | `השנה {hebrew_year} אושרה.` |
| K33 | Admin: validation error | error | `יש שדות חסרים או שגויים. ראה/י אזהרות.` |
| K34 | Generic permission denied (RLS) | error | `אין הרשאות לפעולה זו.` |
| K35 | Generic session expired | warning | `ההתחברות פגה. התחבר/י שוב כדי להמשיך.` + action `[ התחבר ]` |

---

## Additional Requirements — Cross-Cutting

### Keyboard Shortcuts (Desktop)

All shortcuts active only on `/custody-calendar` unless noted. Triggered only when no input is focused.

| Key | Action |
|-----|--------|
| `N` | New exception on selected day |
| `E` | Edit selected day |
| `S` | Open "request swap" for selected day |
| `←` `→` | Move selection by 1 day |
| `↑` `↓` | Move selection by 7 days |
| `PgUp` `PgDn` | Previous / next month |
| `T` or `Home` | Jump to today |
| `Esc` | Close any open popover/sheet |
| `?` | Open shortcut cheat sheet dialog |
| `/` | Focus search in filter drawer |

Shortcut cheat sheet (opened with `?`):
- Title: `קיצורי מקלדת`
- Columns: `פעולה` / `קיצור`
- Close button: `סגור` (Esc works too)

### Mobile Gestures

| Gesture | Context | Action |
|---------|---------|--------|
| Swipe L/R on row | Week grid row | Reveal `[ החלף ]` / `[ חריגה ]` actions |
| Long-press on row | Week grid | Enter multi-select; top bar appears |
| Swipe H on empty area | Week grid | Navigate between weeks |
| Pull-to-refresh | Top of grid | Fetch latest; toast "מעודכן" |
| Tap day cell | Month/week | Open D3 popover |
| Double-tap day | Month | Quick edit (same as `E` shortcut) |
| Pinch | Month grid | Zoom out to quarter view (nice-to-have; skip if complex) |

### Focus Management (Dialogs/Sheets Summary)

| Component | On open focus → | On close focus returns to |
|-----------|----------------|---------------------------|
| OnboardingModal CustodyStep | Close button, then step primary card | Previous trigger (n/a, wizard) |
| C3 Edit Drawer | First tab | `ערוך את הלו"ז שלי` button |
| C4 Read-only preview | Close button | Button that opened it |
| C5 Virtual edit drawer | First input | Button that opened it |
| D3 Day Detail popover | Close button | Originating day cell |
| E3 Conflict sheet | First radio option | Day cell or conflict banner |
| E5 Confirmation modal | Primary CTA `אשר שינוי` | Notification origin (if came from deep link, no return) |
| F1/F3 Swap sheet | Calendar date picker | Day cell |
| G1 Historical edit confirm | `ביטול` button (safer default) | Day cell |
| H3 Consent wall | Primary CTA | (non-dismissible; on confirm → dashboard) |
| I4 Admin edit modal | First input (שם) | Row that was clicked |
| Audit timeline dialog | Close button | `שונה` badge |

Focus trap enforced on all modals/sheets. Esc closes all (except H3 consent wall).

### Copy Review — Warmth Pass

Specific rewrites applied to avoid clinical/legal tone:

- ❌ `שיבוץ ההורה עבור יום זה` → ✅ `מי עם הילדים ביום הזה`
- ❌ `משמורת משפטית` → ✅ never used; we say `הלו"ז שלי`
- ❌ `הסדר ראיה` → ✅ `הלו"ז השבועי`
- ❌ `התובע/הנתבע` → ✅ `{name}` or `ההורה השני`
- ❌ `שינוי לא מאושר` → ✅ `ההצעה ממתינה לאישור`
- ❌ `פעולה אסורה` → ✅ `לא ניתן כרגע לבצע פעולה זו`
- ❌ `חובה למלא` → ✅ `צריך למלא את השדה הזה כדי להמשיך`
- ❌ Over-cheery `!` → removed from error/warning toasts. Kept only on genuinely positive successes (K1, K23, K28).

---

## Implementation Notes for Engineering

**Suggested file structure** (new files indicated with `+`):

```
+ src/components/custody/
    ├─ onboarding/
    │   ├─ CustodyStep.tsx                 (A orchestrator, sub-steps)
    │   ├─ PresetPicker.tsx                (A1)
    │   ├─ CustomWeekGrid.tsx              (A2)
    │   ├─ HandoffTimePicker.tsx           (A3)
    │   ├─ StartDateAndHolder.tsx          (A4)
    │   ├─ PartnerPicker.tsx               (A5)
    │   └─ CustodyPreviewAndSave.tsx       (A6)
    ├─ calendar/
    │   ├─ MonthGrid.tsx                   (D1)
    │   ├─ WeekGrid.tsx                    (D2)
    │   ├─ DayDetail.tsx                   (D3)
    │   ├─ CalendarHeader.tsx              (D4)
    │   ├─ EmptyState.tsx                  (D5)
    │   ├─ ConflictBanner.tsx              (E1)
    │   └─ DayCell.tsx                     (J4)
    ├─ conflict/
    │   ├─ ConflictSheet.tsx               (E3)
    │   └─ ConflictConfirmation.tsx        (E5)
    ├─ swap/
    │   ├─ SwapRequestSheet.tsx            (F1–F3)
    │   └─ SwapConfirmation.tsx            (F4)
    ├─ history/
    │   ├─ HistoricalEditConfirm.tsx       (G1)
    │   ├─ AuditBadge.tsx                  (G2)
    │   └─ AuditTimeline.tsx               (F5/G2 expanded)
    ├─ virtual/
    │   ├─ EditAsToggle.tsx                (H1)
    │   ├─ VirtualPartnerRibbon.tsx        (H2)
    │   └─ ConsentWall.tsx                 (H3)
    └─ shared/
        ├─ PresetCard.tsx                  (J1)
        ├─ WeekGridInput.tsx               (J2)
        ├─ FourteenDayRibbon.tsx           (J3)
        └─ CustodyLegend.tsx

+ src/components/account/
    └─ CustodyScheduleCard.tsx             (C1–C5 shell)

+ src/components/onboarding/steps/
    └─ EducationLevelsStep.tsx             (B1, embedded into ChildrenStep flow)

+ src/pages/admin/
    └─ SchoolCalendar.tsx                  (I1)
    └─ SchoolCalendarYear.tsx              (I3)

+ src/lib/hebrewDates.ts                   (J5)
```

**Key shadcn primitives used:** `Dialog`, `Drawer`, `Sheet`, `Popover`, `Calendar`, `Alert`, `Tabs`, `RadioGroup`, `Select`, `Card`, `Badge`, `Tooltip`, `Checkbox`, `AlertDialog`, `Input`, `Textarea`, `Button`. All already in the project per AccountSettings imports and existing CustodyTable imports.

**External deps already present:** `date-fns` (with `he` locale), `lucide-react` icons, `sonner` toasts, `react-hook-form` + `zod`, TanStack Query.

---

**End of spec.** Every screen includes microcopy, state variants (loading/empty/error/success/conflict/permission-denied), primitives, interaction behaviors, mobile & desktop variations, focus management, and a11y notes. Toast inventory is exhaustive. Engineering should not need further UX clarification.