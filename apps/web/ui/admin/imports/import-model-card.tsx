"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Cpu, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";
import { setImportModel } from "@/lib/admin/settings-actions";
import type { ImportModel } from "@/lib/admin/import-model";
import { cn } from "@/lib/cn";
import { ImportModelLogo } from "./import-model-logo";
import { ImportModelPrice } from "./import-model-price";
import { ImportModelManager } from "./import-model-manager";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Australia/Sydney",
});

export function ImportModelCard({
  canManage,
  model,
  models,
  updatedAt,
  error,
}: {
  canManage: boolean;
  model: string;
  models: ImportModel[];
  updatedAt: string | null;
  error?: string | null;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = models.find((entry) => entry.id === model);
  function choose(next: string) {
    startTransition(async () => {
      try {
        const result = await setImportModel(next);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        router.refresh();
      } catch {
        toast.error("The default model could not be saved. Try again.");
      }
    });
  }
  return (
    <section
      aria-label="Import settings"
      className="flex min-w-0 flex-col items-start gap-3 py-1 sm:col-span-2"
    >
      <div className="space-y-1">
        <h2 className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <Cpu aria-hidden="true" className="size-4 text-muted-foreground" />
          Default import model
        </h2>
        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            Updated {dateFormatter.format(new Date(updatedAt))}
          </p>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            className="h-auto min-h-12 w-full justify-between gap-3 py-2 sm:w-80"
            disabled={!canManage || pending || Boolean(error)}
            aria-label="Import model"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold"
              aria-hidden="true"
            >
              {selected ? (
                <ImportModelLogo model={selected.id} className="size-6" />
              ) : (
                <Cpu className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate">
                {selected?.name ?? "Add an import model"}
              </span>
              {selected ? (
                <span className="block text-xs font-normal text-muted-foreground">
                  {selected.provider}
                </span>
              ) : null}
            </span>
            {selected ? <ImportModelPrice model={selected} /> : null}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex max-w-[calc(100vw-2rem)] min-w-72 flex-col overflow-hidden">
          <div className="max-h-63 min-h-0 overflow-y-auto overscroll-contain">
            {models
              .filter((entry) => entry.visible)
              .map((entry) => (
                <DropdownMenuItem
                  key={entry.id}
                  onSelect={() => choose(entry.id)}
                  className={cn(
                    "h-14 gap-3 py-2.5",
                    entry.id === model
                      ? "bg-primary/10 text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary"
                      : "data-highlighted:bg-accent data-highlighted:text-foreground",
                  )}
                  aria-label={`${entry.name}, ${entry.provider}${entry.id === model ? ", selected" : ""}`}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold"
                    aria-hidden="true"
                  >
                    <ImportModelLogo model={entry.id} className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {entry.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.provider}
                    </span>
                  </span>
                  <ImportModelPrice model={entry} />
                </DropdownMenuItem>
              ))}
          </div>
          <DropdownMenuSeparator className="shrink-0" />
          <DropdownMenuItem
            className="shrink-0"
            onSelect={() => setManagerOpen(true)}
          >
            <Plus />
            Add model
          </DropdownMenuItem>
          <DropdownMenuItem
            className="shrink-0"
            onSelect={() => setManagerOpen(true)}
          >
            <Settings2 />
            Manage models
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {!canManage ? (
        <p className="w-full text-xs text-muted-foreground">
          Import management permission is required to change this.
        </p>
      ) : null}
      {canManage ? (
        <ImportModelManager
          open={managerOpen}
          onOpenChange={setManagerOpen}
          onCloseFocus={() => triggerRef.current?.focus()}
          models={models}
          selected={model}
        />
      ) : null}
    </section>
  );
}
