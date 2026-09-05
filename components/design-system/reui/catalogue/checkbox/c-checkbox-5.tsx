import { Checkbox } from "@reui/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@reui/ui/field"

export default function Pattern() {
  return (
    <Field orientation="horizontal" className="w-auto max-w-xs">
      <Checkbox id="terms-2" defaultChecked />
      <FieldContent>
        <FieldLabel htmlFor="terms-2">Accept terms and conditions</FieldLabel>
        <FieldDescription>
          This checkbox is used to accept the terms and conditions.
        </FieldDescription>
      </FieldContent>
    </Field>
  )
}
