"use client";

import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/cn";

export type AdminTableColumn<Row> = {
  /** Stable key used for the visibility preference. */
  id: string;
  label: string;
  /** Columns marked required cannot be hidden. */
  required?: boolean;
  align?: "left" | "right";
  className?: string;
  cell: (row: Row) => ReactNode;
};

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

function writeRaw(storageKey: string, value: string) {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // A viewer who blocks storage still gets the toggle for this visit.
  }
  for (const listener of [...listeners]) listener();
}

function parseHidden(raw: string): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * A dense record table with per-viewer column visibility. The preference is a
 * convenience, so a browser that refuses storage simply shows every column.
 */
export function AdminRecordTable<Row>({
  caption,
  columns,
  emptyDescription,
  emptyTitle,
  itemName,
  page,
  pageSize,
  pathname,
  rowHref,
  rowKey,
  rows,
  searchParams,
  storageKey,
  total,
}: {
  caption: string;
  columns: AdminTableColumn<Row>[];
  emptyDescription: string;
  emptyTitle: string;
  itemName: string;
  page: number;
  pageSize: number;
  pathname: string;
  rowHref: (row: Row) => string;
  rowKey: (row: Row) => string;
  rows: Row[];
  searchParams: Record<string, string | undefined>;
  storageKey: string;
  total: number;
}) {
  // Read through useSyncExternalStore so the server renders every column and
  // the client reconciles to the stored preference without a cascading render.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(storageKey),
    () => "",
  );
  const hidden = useMemo(() => parseHidden(raw), [raw]);

  function toggle(id: string, visible: boolean) {
    const next = visible
      ? hidden.filter((value) => value !== id)
      : [...new Set([...hidden, id])];
    writeRaw(storageKey, JSON.stringify(next));
  }

  const visible = columns.filter((column) => !hidden.includes(column.id));

  return (
    <DataTableShell
      footer={
        <Pagination
          itemName={itemName}
          page={page}
          pageSize={pageSize}
          pathname={pathname}
          searchParams={searchParams}
          total={total}
        />
      }
    >
      <Table>
        <TableCaption>{caption}</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {visible.map((column) => (
              <TableHead
                className={cn(
                  column.align === "right" && "text-right",
                  column.className,
                )}
                key={column.id}
              >
                {column.label}
              </TableHead>
            ))}
            <TableHead className="w-12 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="grid size-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                    type="button"
                  >
                    <Settings2 aria-hidden="true" size={15} />
                    <span className="sr-only">Choose columns</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Columns</DropdownMenuLabel>
                  {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                      checked={!hidden.includes(column.id)}
                      disabled={column.required}
                      key={column.id}
                      onCheckedChange={(checked) =>
                        toggle(column.id, checked === true)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell className="p-0" colSpan={visible.length + 1}>
                <DataTableEmpty
                  description={emptyDescription}
                  title={emptyTitle}
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow className="group" key={rowKey(row)}>
                {visible.map((column) => (
                  <TableCell
                    className={cn(
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                    key={column.id}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
                <TableCell className="w-12 text-right">
                  <Link
                    aria-label={`Open ${rowKey(row)}`}
                    className="ml-auto grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                    href={rowHref(row)}
                  >
                    <ChevronRight aria-hidden="true" size={16} />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
