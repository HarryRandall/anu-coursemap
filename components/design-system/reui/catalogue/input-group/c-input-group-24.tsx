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
        <InputGroupInput defaultValue="reui_dev" />
        <InputGroupAddon align="inline-end">
          <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500">
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
              className="size-3 text-white"
            />
          </div>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
