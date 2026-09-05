import { Badge } from "@reui/components/badge"

import { Button } from "@reui/ui/button"
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
            <Button variant="outline" size="icon" aria-label="Warning">
              <IconPlaceholder
                lucide="AlertTriangleIcon"
                tabler="IconAlertTriangle"
                hugeicons="Alert01Icon"
                phosphor="WarningIcon"
                remixicon="RiAlertLine"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2 text-sm">
              <IconPlaceholder
                lucide="AlertTriangleIcon"
                tabler="IconAlertTriangle"
                hugeicons="Alert02Icon"
                phosphor="WarningIcon"
                remixicon="RiAlertLine"
                className="size-4 shrink-0"
              />
              This action cannot be undone
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
