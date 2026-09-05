import { Button } from "@reui/ui/button"
import { Kbd, KbdGroup } from "@reui/ui/kbd"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Button variant="outline" aria-label="Search (Command K)">
      <IconPlaceholder
        lucide="SearchIcon"
        tabler="IconSearch"
        hugeicons="Search01Icon"
        phosphor="MagnifyingGlassIcon"
        remixicon="RiSearchLine"
        aria-hidden="true"
      />
      <span>Search</span>
      <KbdGroup aria-hidden="true">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  )
}
