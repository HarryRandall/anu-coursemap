import { Field } from "@reui/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@reui/ui/select"

const items = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
  { label: "Strawberry", value: "strawberry" },
  { label: "Watermelon", value: "watermelon" },
]

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select fruits" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value as string}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
