"use client";
import { Button } from "@coursemap/ui/primitives/button";

import { AppShell } from "@/ui/shell";

import { CatalogueEmpty } from "./catalogue-empty";
import { DataTableShell } from "./catalogue-table";

export function CatalogueError({ reset }: { reset: () => void }) {
  return (
    <AppShell admin fill>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
        <DataTableShell>
          <CatalogueEmpty
            error
            title="Couldn't load this list."
            description="The catalogue data could not be read. Try again to reload it."
          >
            <Button onClick={reset} variant="outline" type="button">
              Try again
            </Button>
          </CatalogueEmpty>
        </DataTableShell>
      </div>
    </AppShell>
  );
}
