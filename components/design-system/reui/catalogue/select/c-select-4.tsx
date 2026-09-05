import { Field } from "@reui/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@reui/ui/select"

const items = Array.from({ length: 100 }).map((_, i) => ({
  label: `Item ${i}`,
  value: `item-${i}`,
}))

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an item" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
