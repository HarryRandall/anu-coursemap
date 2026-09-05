import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@reui/ui/avatar"
import { Button } from "@reui/ui/button"

export default function Pattern() {
  return (
    <Button size="sm">
      <Avatar className="size-5">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CH</AvatarFallback>
      </Avatar>
      <span className="text-xs">@shadcn</span>
    </Button>
  )
}
