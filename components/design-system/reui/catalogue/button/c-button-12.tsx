import { Button } from "@reui/ui/button"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Button>
      Get Started
      <IconPlaceholder
        lucide="ArrowRightIcon"
        tabler="IconArrowRight"
        hugeicons="ArrowRight02Icon"
        phosphor="ArrowRightIcon"
        remixicon="RiArrowRightLine"
        aria-hidden="true"
      />
    </Button>
  )
}
