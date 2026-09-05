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
            "!rounded-lg !border-border !bg-card !text-foreground !shadow-lg",
          title: "!text-sm !font-medium",
          description: "!text-xs !text-muted-foreground",
          closeButton:
            "!border-border !bg-card !text-muted-foreground hover:!bg-muted/50 hover:!text-foreground",
        },
      }}
      {...props}
    />
  );
}
