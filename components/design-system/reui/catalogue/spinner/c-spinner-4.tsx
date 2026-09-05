import { Field, FieldLabel } from "@reui/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import { Spinner } from "@reui/ui/spinner"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel htmlFor="search-loading">Searching</FieldLabel>
      <InputGroup id="search-loading">
        <InputGroupInput placeholder="Search records…" />
        <InputGroupAddon>
          <Spinner className="size-4" />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
