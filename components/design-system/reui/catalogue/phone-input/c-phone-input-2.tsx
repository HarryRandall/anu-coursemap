import { PhoneInput } from "@reui/components/phone-input"

export default function Pattern() {
  return (
    <PhoneInput
      variant="sm"
      placeholder="Enter phone number"
      defaultCountry="NL"
      value="+31612345678"
    />
  )
}
