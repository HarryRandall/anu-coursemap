"use client"

import { useState } from "react"

import { Button } from "@reui/ui/button"
import { Field, FieldDescription } from "@reui/ui/field"
import { Input } from "@reui/ui/input"
import { Label } from "@reui/ui/label"
import { IconPlaceholder } from "@reui/icon-placeholder"

export default function Pattern() {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState("My Awesome Project")

  return (
    <Field className="w-full max-w-xs">
      <Label htmlFor="label-inline-edit" className="gap-2">
        Project Name
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
              className="size-3.5"
            />
          ) : (
            <IconPlaceholder
              lucide="PencilIcon"
              tabler="IconPencil"
              hugeicons="PenIcon"
              phosphor="PencilIcon"
              remixicon="RiPencilLine"
              className="size-3.5"
            />
          )}
        </Button>
      </Label>
      {isEditing ? (
        <Input
          id="label-inline-edit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      ) : (
        <FieldDescription>{value}</FieldDescription>
      )}
    </Field>
  )
}
