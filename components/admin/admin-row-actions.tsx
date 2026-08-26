"use client";

import {
  ExternalLink,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminRowActions({
  label,
  onResync,
  openHref,
  resyncing = false,
  sourceUrl,
  studentHref,
}: {
  label: string;
  onResync?: () => void;
  openHref: string;
  resyncing?: boolean;
  sourceUrl?: string;
  studentHref?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="ml-auto grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900"
          type="button"
        >
          {resyncing ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
              size={16}
            />
          ) : (
            <MoreHorizontal aria-hidden="true" size={16} />
          )}
          <span className="sr-only">Actions for {label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={openHref}>
            <SquarePen aria-hidden="true" /> Review
          </Link>
        </DropdownMenuItem>
        {studentHref ? (
          <DropdownMenuItem asChild>
            <Link href={studentHref}>
              <ExternalLink aria-hidden="true" /> Student page
            </Link>
          </DropdownMenuItem>
        ) : null}
        {sourceUrl ? (
          <DropdownMenuItem asChild>
            <a href={sourceUrl} rel="noreferrer" target="_blank">
              <ExternalLink aria-hidden="true" /> ANU page
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </DropdownMenuItem>
        ) : null}
        {onResync ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={resyncing} onSelect={onResync}>
              <RefreshCw aria-hidden="true" />
              {resyncing ? "Resyncing..." : "Resync from ANU"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
