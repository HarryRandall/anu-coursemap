import { toast } from "sonner"

import { Field } from "@reui/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@reui/ui/input-group"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Field className="w-full max-w-xs">
      <InputGroup>
        <InputGroupInput defaultValue="https://reui.com/share" readOnly />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            variant="ghost"
            size="icon-xs"
            onClick={() => toast.success("Copied to clipboard")}
          >
            <IconPlaceholder
              lucide="CopyIcon"
              tabler="IconCopy"
              hugeicons="CopyIcon"
              phosphor="CopyIcon"
              remixicon="RiFileCopyLine"
              className="size-4"
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
