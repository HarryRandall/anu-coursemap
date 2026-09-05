import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="input-demo-file">File</FieldLabel>
      <Input id="input-demo-file" type="file" />
    </Field>
  )
}
