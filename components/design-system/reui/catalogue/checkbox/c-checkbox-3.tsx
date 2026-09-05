import { Checkbox } from "@reui/ui/checkbox"
import { Field, FieldLabel } from "@reui/ui/field"

export default function Pattern() {
  return (
    <Field orientation="horizontal" className="w-auto" data-invalid>
      <Checkbox id="invalid" aria-invalid />
      <FieldLabel htmlFor="invalid">Invalid checkbox</FieldLabel>
    </Field>
  )
}
