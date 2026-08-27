import { Button } from "@/components/ui/button";

/**
 * A configuration row, so it is shaped like the table below it rather than
 * floating above a bare bottom border.
 */
export function AutoSyncCard() {
  return (
    <section
      aria-label="Automatic imports"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-xs"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-zinc-300"
      />
      <span className="text-sm font-medium text-zinc-800">Auto sync</span>
      <span className="text-[13px] text-zinc-500">Not set up</span>
      <Button className="ml-auto" size="sm" variant="secondary">
        Set up
      </Button>
    </section>
  );
}
