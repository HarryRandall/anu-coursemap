import { Toggle } from "@reui/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@reui/ui/tooltip"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle variant="outline" aria-label="Pin to sidebar">
              <IconPlaceholder
                lucide="PinIcon"
                tabler="IconPin"
                hugeicons="Pin02Icon"
                phosphor="PushPinIcon"
                remixicon="RiPushpinLine"
              />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">Pin to sidebar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
