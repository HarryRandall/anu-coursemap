import { Field } from "@reui/ui/field"
import {
  InputGroup,
  InputGroupInput,
} from "@reui/ui/input-group"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
      </InputGroup>
    </Field>
  )
}
