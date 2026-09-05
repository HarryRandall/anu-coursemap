import { Button } from "@reui/ui/button"
import { ButtonGroup } from "@reui/ui/button-group"
import { Input } from "@reui/ui/input"

export default function Pattern() {
  return (
    <ButtonGroup>
      <Button variant="outline">Button</Button>
      <Input placeholder="Type something here..." />
    </ButtonGroup>
  )
}
