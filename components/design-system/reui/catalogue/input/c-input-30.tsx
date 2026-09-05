import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel htmlFor="pill-input">Search</FieldLabel>
      <Input
        id="pill-input"
        className="rounded-full px-4"
        placeholder="Search everything..."
      />
    </Field>
  )
}
