import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel htmlFor="input-demo-email">Email</FieldLabel>
      <Input
        id="input-demo-email"
        type="email"
        placeholder="name@example.com"
      />
    </Field>
  )
}
