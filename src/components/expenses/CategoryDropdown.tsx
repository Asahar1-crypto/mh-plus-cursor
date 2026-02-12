import { CustomDropdown } from "@/components/ui/custom-dropdown"

const DEFAULT_CATEGORIES = ['חינוך', 'רפואה', 'פנאי', 'ביגוד', 'מזון', 'מזונות', 'קייטנות', 'אחר'];

interface CategoryDropdownProps {
  value?: string
  onValueChange: (value: string) => void
  className?: string
  categories?: string[]
}

export function CategoryDropdown({ value, onValueChange, className, categories = DEFAULT_CATEGORIES }: CategoryDropdownProps) {
  const options = categories.map(category => ({
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