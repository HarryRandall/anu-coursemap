import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="input-demo-url">URL</FieldLabel>
      <Input id="input-demo-url" type="url" placeholder="https://example.com" />
    </Field>
  )
}
