import { Checkbox } from "@reui/ui/checkbox"
import { Field, FieldLabel } from "@reui/ui/field"

export default function Pattern() {
  return (
    <Field orientation="horizontal" className="w-auto">
      <Checkbox id="terms" />
      <FieldLabel htmlFor="terms">Basic checkbox</FieldLabel>
    </Field>
  )
}
