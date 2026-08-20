"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      closeButton
      visibleToasts={4}
      gap={8}
      toastOptions={{
        duration: 3600,
        classNames: {
          toast:
            "!rounded-lg !border-zinc-200 !bg-white !text-zinc-950 !shadow-lg",
          title: "!text-sm !font-medium",
          description: "!text-xs !text-zinc-500",
          closeButton:
            "!border-zinc-200 !bg-white !text-zinc-500 hover:!bg-zinc-50 hover:!text-zinc-900",
        },
      }}
      {...props}
    />
  );
}
