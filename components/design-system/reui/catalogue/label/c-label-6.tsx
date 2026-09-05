import { Field } from "@reui/ui/field"
import { Input } from "@reui/ui/input"
import { Label } from "@reui/ui/label"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <Label htmlFor="label-optional">
        Phone number
        <span className="text-muted-foreground">(optional)</span>
      </Label>
      <Input id="label-optional" type="tel" placeholder="+1 (555) 000-0000" />
    </Field>
  )
}
