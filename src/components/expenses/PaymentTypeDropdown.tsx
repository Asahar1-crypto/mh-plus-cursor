import { CustomDropdown } from "@/components/ui/custom-dropdown"

const getPaymentTypes = (otherUserName: string) => [
  { value: "i_paid_shared", label: "אני שילמתי - יש לחלוק" },
  { value: "i_paid_theirs", label: `שילמתי - על ${otherUserName} להחזיר` },
  { value: "they_paid_shared", label: `${otherUserName} שילם/ה - יש לחלוק` },
  { value: "they_paid_mine", label: `${otherUserName} שילם/ה - עליי להחזיר` }
]

interface PaymentTypeDropdownProps {
  value?: string
  onValueChange: (value: string) => void
  otherUserName?: string
  className?: string
}

export function PaymentTypeDropdown({ value, onValueChange, otherUserName, className }: PaymentTypeDropdownProps) {
  const paymentTypes = getPaymentTypes(otherUserName || 'השותף/ה')

  return (
    <CustomDropdown
      options={paymentTypes}
      value={value}
      onValueChange={onValueChange}
      placeholder="בחר סוג תשלום"
      className={className}
    />
  )
}