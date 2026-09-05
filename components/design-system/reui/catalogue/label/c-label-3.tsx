import { Field } from "@reui/ui/field"
import { Label } from "@reui/ui/label"
import { Textarea } from "@reui/ui/textarea"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <Label htmlFor="label-demo-message">Message</Label>
      <Textarea id="label-demo-message" placeholder="Type your message here…" />
    </Field>
  )
}
