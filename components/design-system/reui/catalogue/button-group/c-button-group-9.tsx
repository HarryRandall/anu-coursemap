import { Button } from "@reui/ui/button"
import { ButtonGroup } from "@reui/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@reui/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@reui/ui/tooltip"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="icon">
          <IconPlaceholder
            lucide="SendIcon"
            tabler="IconSend"
            hugeicons="SentIcon"
            phosphor="PaperPlaneTiltIcon"
            remixicon="RiSendInsLine"
            aria-hidden="true"
          />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <InputGroup>
          <InputGroupInput placeholder="Send a message..." />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupAddon align="inline-end">
                  <IconPlaceholder
                    lucide="AudioLinesIcon"
                    tabler="IconBrandGooglePodcasts"
                    hugeicons="AudioWave01Icon"
                    phosphor="WaveformIcon"
                    remixicon="RiVoiceprintLine"
                    aria-hidden="true"
                  />
                </InputGroupAddon>
              </TooltipTrigger>
              <TooltipContent>Voice Mode</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </InputGroup>
      </ButtonGroup>
    </ButtonGroup>
  )
}
