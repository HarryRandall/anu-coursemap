import { Field } from "@reui/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <InputGroup>
        <InputGroupAddon>
          <IconPlaceholder
            lucide="SearchIcon"
            tabler="IconSearch"
            hugeicons="Search01Icon"
            phosphor="MagnifyingGlassIcon"
            remixicon="RiSearchLine"
          />
        </InputGroupAddon>
        <InputGroupInput placeholder="Search..." />
      </InputGroup>
    </Field>
  )
}
