import { CustomDropdown } from "@/components/ui/custom-dropdown"

const CATEGORIES = [
  'חינוך',
  'רפואה',
  'פנאי',
  'ביגוד',
  'מזון',
  'מזונות',
  'קייטנות',
  'אחר'
]

interface CategoryDropdownProps {
  value?: string
  onValueChange: (value: string) => void
  className?: string
}

export function CategoryDropdown({ value, onValueChange, className }: CategoryDropdownProps) {
  const options = CATEGORIES.map(category => ({
    value: category,
    label: category
  }))

  return (
    <CustomDropdown
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="בחר קטגוריה"
      className={className}
    />
  )
}