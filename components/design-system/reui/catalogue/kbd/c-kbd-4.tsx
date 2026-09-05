import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import { Kbd } from "@reui/ui/kbd"

export default function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <InputGroup className="max-w-xs">
        <InputGroupInput placeholder="Search…" />
        <InputGroupAddon>
          <Kbd>Space</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
