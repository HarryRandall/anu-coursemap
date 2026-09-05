import { Field, FieldLabel } from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field orientation="horizontal" className="w-full max-w-xs">
      <FieldLabel htmlFor="horizontal-name" className="w-24">
        Name
      </FieldLabel>
      <Input id="horizontal-name" placeholder="John Doe" />
    </Field>
  )
}
