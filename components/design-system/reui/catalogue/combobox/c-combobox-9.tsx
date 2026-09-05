import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@reui/ui/combobox"
import { Field } from "@reui/ui/field"
import { InputGroupAddon } from "@reui/ui/input-group"
import { IconPlaceholder } from "@reui/icon-placeholder"

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"]

export default function Pattern() {
  return (
    <Field className="max-w-xs">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework">
          <InputGroupAddon>
            <IconPlaceholder
              lucide="GlobeIcon"
              tabler="IconWorld"
              hugeicons="Globe02Icon"
              phosphor="GlobeSimpleIcon"
              remixicon="RiGlobalLine"
              className="text-muted-foreground size-4"
            />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
