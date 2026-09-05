import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@reui/components/alert"

import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Alert>
      <IconPlaceholder
        lucide="CircleCheckIcon"
        tabler="IconCircleCheck"
        hugeicons="CheckmarkCircle01Icon"
        phosphor="CheckCircleIcon"
        remixicon="RiCheckboxCircleLine"
      />
      <AlertTitle>Alert!</AlertTitle>
      <AlertDescription>
        This is an alert with icon, title and description.
      </AlertDescription>
    </Alert>
  )
}
