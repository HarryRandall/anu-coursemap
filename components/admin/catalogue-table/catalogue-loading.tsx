import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";

import {
  DataTableShell,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableCaption,
} from "./catalogue-table";

export function CatalogueLoading({
  noun,
  imports = false,
  layout,
}: {
  noun: string;
  imports?: boolean;
  layout?: "public-courses" | "users";
}) {
  const columns =
    layout === "public-courses"
      ? ["Course", "Year", "Requisites", "Available", "Units", "Actions"]
      : layout === "users"
        ? ["User", "Role", "Joined", "Updated", "Actions"]
        : imports
          ? ["Import", "Year", "Outcome", "Change", "Started", "Actions"]
          : ["Select", noun, "Year", "Status", "Units", "Actions"];
  return (
    <AppShell admin={layout !== "public-courses"} fill>
      <div
        aria-busy="true"
        className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4"
      >
        <h1 className="sr-only">Loading {noun}</h1>
        {!imports && !layout ? (
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        ) : null}
        <Skeleton className="h-10 w-full shrink-0" />
        <DataTableShell
          imports={imports}
          layout={layout}
          selectable={!layout}
          footer={
            <div className="flex h-8 items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-28" />
            </div>
          }
        >
          <Table>
            <TableCaption className="sr-only">Loading {noun}</TableCaption>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>
                    {column === "Select" || column === "Actions" ? (
                      <span className="sr-only">{column}</span>
                    ) : (
                      column
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 7 }, (_, row) => (
                <TableRow key={row}>
                  {columns.map((column, index) => (
                    <TableCell key={column}>
                      {index === (imports || layout ? 0 : 1) ? (
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-2/3" />
                            <Skeleton className="h-2 w-14" />
                          </div>
                        </div>
                      ) : (
                        <Skeleton
                          className={
                            column === "Select" || column === "Actions"
                              ? "size-4"
                              : "h-3 w-2/3"
                          }
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </AppShell>
  );
}
