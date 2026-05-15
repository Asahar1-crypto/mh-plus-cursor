# Mascots — illustrations for empty/success/error/info states

Wallet-character mascots used across the app for state illustrations
(empty lists, success/error toasts, onboarding hero, etc.).

## Naming convention

`<color>-<state-or-prop>.png`

Lowercase, kebab-case, English. Keeps imports simple and avoids RTL issues
in file paths.

## Inventory

The naming below maps the cases the user has on disk. Save each file to
`public/mascots/` with the name in the **File** column.

### Single-character mascots

| File | Description | Suggested usage |
|------|-------------|------------------|
| `blue-default.png` | Blue wallet, neutral/happy, hands at sides | Default avatar / hero |
| `blue-happy.png` | Blue wallet, big smile, arms raised | Generic success / celebration |
| `blue-thinking.png` | Blue wallet, hand on chin, uncertain look | "no results" / loading-prompt |
| `blue-waiting.png` | Blue wallet sitting on chair holding watch | Pending state / "waiting for approval" |
| `blue-warning.png` | Blue wallet holding yellow warning triangle | Non-blocking warning |
| `blue-error.png` | Blue wallet holding red X icon | Failed action / error toast |
| `blue-approved.png` | Blue wallet winking with green checkmark badge | Approved expense / success state |
| `blue-security.png` | Blue wallet holding shield + padlock | Security settings / privacy |
| `blue-verified.png` | Blue wallet holding phone showing checkmark | OTP success / phone verified |
| `blue-search.png` | Blue wallet with magnifying glass | Search / audit / discovery |
| `orange-default.png` | Orange wallet with glasses, waving | Default "mom" avatar |
| `orange-calculator.png` | Orange wallet with glasses holding calculator | Budget / calculation screen |
| `orange-checklist.png` | Orange wallet with glasses holding clipboard | Tasks completed / approvals list |
| `orange-organize.png` | Orange wallet with stack of colored drawers | Categories / organize / file expenses |
| `teal-coin.png` | Teal/turquoise wallet holding gold coin | Income / earned / settlement received |
| `pink-heart.png` | Pink wallet holding red heart | Favorite / loved item / partner |

### Group mascots (Family of 4)

| File | Description | Suggested usage |
|------|-------------|------------------|
| `family-group.png` | Blue dad + orange mom + teal son + pink daughter, neutral lighting | Onboarding hero / "create family" |
| `family-group-warm.png` | Same family, warm orange background | Settlement / connection screens |
| `family-group-cool.png` | Same family, cool teal/orange split background | Marketing / share screens |

## How to use in React

```tsx
// Static asset import — Vite serves /public as-is
<img
  src="/mascots/blue-error.png"
  alt="שגיאה"
  className="w-32 h-32"
/>
```

For empty states, prefer the appropriate mood:
- Empty list (no data yet) → `blue-thinking.png`
- Permission denied / blocked → `blue-warning.png` or `blue-error.png`
- Action successful → `blue-approved.png` or `blue-happy.png`
- Loading / pending approval → `blue-waiting.png`
