import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="input-demo-password">Password</FieldLabel>
      <Input id="input-demo-password" type="password" placeholder="Password" />
    </Field>
  )
}
