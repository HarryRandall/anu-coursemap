"use client";

import {
  Archive,
  ExternalLink,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminRowActions({
  archived = false,
  label,
  onArchive,
  onResync,
  openHref,
  resyncing = false,
  sourceUrl,
  studentHref,
}: {
  archived?: boolean;
  label: string;
  onArchive?: () => void | Promise<void>;
  onResync?: () => void;
  openHref: string;
  resyncing?: boolean;
  sourceUrl?: string;
  studentHref?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="ml-auto grid size-8 cursor-pointer place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900"
            ref={triggerRef}
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
            <DropdownMenuItem disabled={resyncing} onSelect={onResync}>
              <RefreshCw aria-hidden="true" />
              {resyncing ? "Resyncing..." : "Resync from ANU"}
            </DropdownMenuItem>
          ) : null}
          {onArchive ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700 [&>svg]:text-rose-500"
                disabled={archived}
                onSelect={() => {
                  setMenuOpen(false);
                  window.requestAnimationFrame(() => setConfirmOpen(true));
                }}
              >
                <Archive aria-hidden="true" />
                {archived ? "Archived" : "Archive"}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {onArchive ? (
        <ConfirmDialog
          confirmLabel="Archive"
          description={
            <>
              This hides {label} from students and removes it from the working
              catalogue. You can publish it again later.
            </>
          }
          destructive
          onConfirm={onArchive}
          onOpenChange={setConfirmOpen}
          open={confirmOpen}
          returnFocusRef={triggerRef}
          title={`Archive ${label}?`}
        />
      ) : null}
    </>
  );
}
