import { CustomDropdown } from "@/components/ui/custom-dropdown"
import type { Child } from "@/contexts/expense/types"

interface ChildDropdownProps {
  children: Child[]
  value?: string
  onValueChange: (value: string) => void
  className?: string
}

export function ChildDropdown({ children, value, onValueChange, className }: ChildDropdownProps) {
  const options = [
    { value: "none", label: "ללא שיוך" },
    ...children.map(child => ({
      value: child.id,
      label: child.name
    }))
  ]

  return (
    <CustomDropdown
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="בחר ילד"
      className={className}
    />
  )
}