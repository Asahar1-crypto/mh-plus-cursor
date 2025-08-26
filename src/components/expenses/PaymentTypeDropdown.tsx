import { CustomDropdown } from "@/components/ui/custom-dropdown"

const PAYMENT_TYPES = [
  { value: "cash", label: "מזומן" },
  { value: "credit_card", label: "כרטיס אשראי" },
  { value: "debit_card", label: "כרטיס חיוב" },
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "check", label: "המחאה" },
  { value: "digital_wallet", label: "ארנק דיגיטלי" }
]

interface PaymentTypeDropdownProps {
  value?: string
  onValueChange: (value: string) => void
  className?: string
}

export function PaymentTypeDropdown({ value, onValueChange, className }: PaymentTypeDropdownProps) {
  return (
    <CustomDropdown
      options={PAYMENT_TYPES}
      value={value}
      onValueChange={onValueChange}
      placeholder="בחר סוג תשלום"
      className={className}
    />
  )
}