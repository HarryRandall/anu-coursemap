"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export function PopoverTrigger(
  props: ComponentProps<typeof PopoverPrimitive.Trigger>,
) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export function PopoverClose(
  props: ComponentProps<typeof PopoverPrimitive.Close>,
) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  onCloseAutoFocus,
  onPointerDownOutside,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  const closedByPointer = useRef(false);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[120] w-80 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-950 shadow-lg outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-modal-in motion-reduce:animate-none",
          className,
        )}
        onPointerDownOutside={(event) => {
          closedByPointer.current = true;
          onPointerDownOutside?.(event);
        }}
        onCloseAutoFocus={(event) => {
          if (closedByPointer.current) {
            event.preventDefault();
            closedByPointer.current = false;
          }
          onCloseAutoFocus?.(event);
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
