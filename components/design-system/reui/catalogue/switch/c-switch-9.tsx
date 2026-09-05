import { Field, FieldLabel } from "@reui/ui/field"
import { Switch } from "@reui/ui/switch"
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
      <Field orientation="horizontal">
        <Switch id="sw-tooltip" />
        <div className="flex items-center gap-1.5">
          <FieldLabel htmlFor="sw-tooltip">
            Two-factor authentication
          </FieldLabel>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-muted-foreground">
                <IconPlaceholder
                  lucide="HelpCircleIcon"
                  tabler="IconHelpCircle"
                  hugeicons="HelpCircleIcon"
                  phosphor="QuestionIcon"
                  remixicon="RiQuestionLine"
                  aria-hidden="true"
                  className="size-3.5"
                />
              </TooltipTrigger>
              <TooltipContent side="right">
                Adds an extra layer of security by requiring a verification code
                on login.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Field>
    </div>
  )
}
