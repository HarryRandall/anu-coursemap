import { Button } from "@reui/ui/button"
import { ButtonGroup } from "@reui/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@reui/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <ButtonGroup className="max-w-xs">
      <InputGroup>
        <InputGroupAddon>
          <IconPlaceholder
            lucide="SearchIcon"
            tabler="IconSearch"
            hugeicons="Search01Icon"
            phosphor="MagnifyingGlassIcon"
            remixicon="RiSearchLine"
            aria-hidden="true"
          />
        </InputGroupAddon>
        <InputGroupInput placeholder="Filter records..." />
      </InputGroup>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Search" className="border-primary border">
            Search
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>All Records</DropdownMenuItem>
          <DropdownMenuItem>Recent</DropdownMenuItem>
          <DropdownMenuItem>Archived</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
