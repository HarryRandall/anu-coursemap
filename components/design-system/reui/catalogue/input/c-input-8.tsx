import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="input-demo-tel">Phone</FieldLabel>
      <Input id="input-demo-tel" type="tel" placeholder="+1 (555) 123-4567" />
    </Field>
  )
}
