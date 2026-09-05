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
            lucide="FileIcon"
            tabler="IconFile"
            hugeicons="FileEmpty02Icon"
            phosphor="FileIcon"
            remixicon="RiFileLine"
            aria-hidden="true"
          />
        </InputGroupAddon>
        <InputGroupInput placeholder="Enter file name..." />
      </InputGroup>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Filter">
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="PlusSignIcon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
              aria-hidden="true"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>New File</DropdownMenuItem>
          <DropdownMenuItem>New Folder</DropdownMenuItem>
          <DropdownMenuItem>New Workspace</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
