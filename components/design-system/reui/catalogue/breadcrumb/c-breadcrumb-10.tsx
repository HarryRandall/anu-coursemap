import { Frame, FramePanel } from "@reui/components/frame"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@reui/ui/breadcrumb"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  return (
    <Frame>
      <FramePanel className="gap-2 px-3! py-2!">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#" className="flex items-center gap-1.5">
                <IconPlaceholder
                  lucide="HouseIcon"
                  tabler="IconHome"
                  hugeicons="Home03Icon"
                  phosphor="HouseIcon"
                  remixicon="RiHome5Line"
                  className="size-4"
                  aria-hidden="true"
                />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">
                Checkout
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </FramePanel>
    </Frame>
  )
}
