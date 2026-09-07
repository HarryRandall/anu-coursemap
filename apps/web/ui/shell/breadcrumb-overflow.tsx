"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BreadcrumbEllipsis } from "@coursemap/ui/primitives/breadcrumb";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";

export function BreadcrumbOverflow({
  crumbs,
}: {
  crumbs: { label: string; href?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const hovered = useRef(false);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function keepOpen() {
    clearTimeout(closeTimer.current);
  }

  function closeSoon() {
    if (hovered.current) {
      closeTimer.current = setTimeout(() => setOpen(false), 180);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return;
            keepOpen();
            hovered.current = true;
            setOpen(true);
          }}
          onPointerLeave={closeSoon}
          onPointerDown={() => {
            hovered.current = false;
            keepOpen();
          }}
          onKeyDown={() => {
            hovered.current = false;
            keepOpen();
          }}
        >
          <BreadcrumbEllipsis aria-hidden="true" />
          <span className="sr-only">Show hidden breadcrumbs</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-max max-w-[calc(100vw-2rem)]"
        onPointerEnter={keepOpen}
        onPointerLeave={closeSoon}
        onCloseAutoFocus={(event) => {
          if (hovered.current) event.preventDefault();
        }}
      >
        {crumbs.map((crumb, index) =>
          crumb.href && crumb.label ? (
            <DropdownMenuItem key={index} asChild>
              <Link href={crumb.href} className="whitespace-normal">
                {crumb.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={index} disabled>
              {crumb.label || "Loading…"}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
