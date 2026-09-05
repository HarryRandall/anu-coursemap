import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="input-demo-number">Number</FieldLabel>
      <Input id="input-demo-number" type="number" placeholder="123" />
    </Field>
  )
}
