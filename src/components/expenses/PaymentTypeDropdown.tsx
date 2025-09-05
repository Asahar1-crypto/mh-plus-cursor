import { CustomDropdown } from "@/components/ui/custom-dropdown"

const PAYMENT_TYPES = [
  { value: "i_paid_shared", label: "אני שילמתי - הוצאה משותפת" },
  { value: "i_paid_theirs", label: "אני שילמתי - הוצאה של השותף" },
  { value: "they_paid_shared", label: "השותף שילם/ה - הוצאה משותפת" },
  { value: "they_paid_mine", label: "השותף שילם/ה - הוצאה שלי" },
  { value: "i_owe_them", label: "אני צריך לשלם לשותף" },
  { value: "they_owe_me", label: "השותף צריך/צריכה לשלם לי" }
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