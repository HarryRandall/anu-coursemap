import { Field } from "@reui/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import { Spinner } from "@reui/ui/spinner"

export default function Pattern() {
  return (
    <Field className="max-w-xs" data-disabled="true">
      <InputGroup>
        <InputGroupInput defaultValue="shadcn_ui" disabled />
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
