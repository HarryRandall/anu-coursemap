import { Checkbox } from "@reui/ui/checkbox"
import { Field } from "@reui/ui/field"
import { Label } from "@reui/ui/label"

export default function Pattern() {
  return (
    <Field orientation="horizontal" className="mx-auto w-auto">
      <Checkbox id="label-demo-terms" />
      <Label htmlFor="label-demo-terms">Accept terms and conditions</Label>
    </Field>
  )
}
