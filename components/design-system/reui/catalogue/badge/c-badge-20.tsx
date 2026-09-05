import { Badge } from "@reui/components/badge"

import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Badge variant="outline">
      <IconPlaceholder
        lucide="CheckIcon"
        tabler="IconCheck"
        hugeicons="Tick02Icon"
        phosphor="CheckIcon"
        remixicon="RiCheckLine"
      />
      Badge
    </Badge>
  )
}
