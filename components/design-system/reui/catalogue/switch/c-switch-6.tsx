import { Card } from "@reui/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@reui/ui/field"
import { Separator } from "@reui/ui/separator"
import { Switch } from "@reui/ui/switch"

export default function Pattern() {
  return (
    <Card className="w-full max-w-xs p-0">
      <FieldGroup className="gap-0">
        <Field>
          <FieldLabel className="justify-between px-4 py-3">
            <FieldTitle>Push notifications</FieldTitle>
            <Switch defaultChecked />
          </FieldLabel>
        </Field>
        <Separator />
        <Field>
          <FieldLabel className="justify-between px-4 py-3">
            <FieldTitle>Email notifications</FieldTitle>
            <Switch />
          </FieldLabel>
        </Field>
        <Separator />
        <Field>
          <FieldLabel className="justify-between px-4 py-3">
            <FieldTitle>SMS notifications</FieldTitle>
            <Switch />
          </FieldLabel>
        </Field>
      </FieldGroup>
    </Card>
  )
}
