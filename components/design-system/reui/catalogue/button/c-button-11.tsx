import { Button } from "@reui/ui/button"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Button size="icon" aria-label="Search">
      <IconPlaceholder
        lucide="SearchIcon"
        tabler="IconSearch"
        hugeicons="Search01Icon"
        phosphor="MagnifyingGlassIcon"
        remixicon="RiSearchLine"
        aria-hidden="true"
      />
    </Button>
  )
}
