import { CustomDropdown } from "@/components/ui/custom-dropdown"

const PAYMENT_TYPES = [
  { value: "i_paid_shared", label: "שילמתי - הוצאה משותפת" },
  { value: "i_paid_theirs", label: "שילמתי עבורם" },
  { value: "they_paid_shared", label: "הם שילמו - הוצאה משותפת" },
  { value: "they_paid_mine", label: "הם שילמו עבורי" },
  { value: "i_owe_them", label: "אני חייב להם" },
  { value: "they_owe_me", label: "הם חייבים לי" }
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