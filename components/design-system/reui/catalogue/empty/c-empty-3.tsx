import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@reui/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import { Kbd } from "@reui/ui/kbd"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>404 — Not Found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist. Try searching
            for what you need below.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <InputGroup className="w-3/4">
            <InputGroupInput placeholder="Try searching for pages…" />
            <InputGroupAddon>
              <IconPlaceholder
                lucide="CircleDashedIcon"
                tabler="IconCircleDashed"
                hugeicons="DashedLineCircleIcon"
                phosphor="CircleDashedIcon"
                remixicon="RiLoaderLine"
              />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <EmptyDescription>
            Need help? <a href="#">Contact support</a>
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    </div>
  )
}
