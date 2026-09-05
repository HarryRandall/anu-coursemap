import { Badge } from "@reui/components/badge"

export default function Pattern() {
  return (
    <Badge variant="outline">
      <img
        src="https://flagcdn.com/us.svg"
        alt="US"
        width={18}
        height={18}
        className="rounded-xs"
      />
      USA
    </Badge>
  )
}
