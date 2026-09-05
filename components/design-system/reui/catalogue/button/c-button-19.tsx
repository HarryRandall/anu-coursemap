import { Button } from "@reui/ui/button"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Button variant="outline">
      Options
      <IconPlaceholder
        lucide="Settings2Icon"
        tabler="IconAdjustmentsHorizontal"
        hugeicons="FilterHorizontalIcon"
        phosphor="SlidersHorizontalIcon"
        remixicon="RiEqualizer2Line"
        aria-hidden="true"
      />
    </Button>
  )
}
