import { IconTile } from "@reui/components/icon-tile"

import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <IconTile variant="elevated" aria-hidden="true">
        <IconPlaceholder
          lucide="PackageIcon"
          tabler="IconPackage"
          hugeicons="Package01Icon"
          phosphor="PackageIcon"
          remixicon="RiBox3Line"
        />
      </IconTile>
    </div>
  )
}
