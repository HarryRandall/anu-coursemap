import { Field } from "@reui/ui/field"
import { Input } from "@reui/ui/input"
import { Label } from "@reui/ui/label"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <Label htmlFor="label-demo-username">Username</Label>
      <Input id="label-demo-username" placeholder="Enter your username…" />
    </Field>
  )
}
