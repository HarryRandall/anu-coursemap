import { Field } from "@reui/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@reui/ui/input-group"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <InputGroup>
        <InputGroupInput placeholder="username" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>@gmail.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
