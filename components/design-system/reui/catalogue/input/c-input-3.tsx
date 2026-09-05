import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@reui/ui/field"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="input-demo-username">Username</FieldLabel>
      <Input
        id="input-demo-username"
        type="text"
        placeholder="Enter your username"
      />
      <FieldDescription>
        Choose a unique username for your account.
      </FieldDescription>
    </Field>
  )
}
