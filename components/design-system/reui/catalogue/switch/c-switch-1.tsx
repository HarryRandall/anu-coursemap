import { Field, FieldLabel } from "@reui/ui/field"
import { Switch } from "@reui/ui/switch"

export default function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Field orientation="horizontal">
        <Switch id="switch-basic" />
        <FieldLabel htmlFor="switch-basic">Airplane Mode</FieldLabel>
      </Field>
    </div>
  )
}
