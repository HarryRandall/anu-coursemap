import { Button } from "@reui/ui/button"
import { Spinner } from "@reui/ui/spinner"

export default function Pattern() {
  return (
    <Button disabled>
      <Spinner aria-hidden="true" />
      Please wait
    </Button>
  )
}
