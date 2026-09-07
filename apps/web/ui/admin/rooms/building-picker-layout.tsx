import type { ReactNode } from "react";

export function BuildingPickerLayout({
  rail,
  children,
  loading = false,
}: {
  rail: ReactNode;
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      aria-busy={loading || undefined}
      data-slot="building-picker"
      className="grid min-h-0 w-full flex-1 gap-4 p-4 lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <aside
        data-slot="building-picker-rail"
        className="flex max-h-64 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:max-h-none"
      >
        {rail}
      </aside>
      {/* Explicit clipping also contains the map canvas when the browser composites it separately. */}
      <main
        aria-label="Campus map"
        data-slot="building-picker-map"
        className="relative isolate min-h-[30rem] min-w-0 overflow-hidden rounded-xl border bg-muted [clip-path:inset(0_round_var(--radius-xl))] lg:min-h-0"
      >
        {children}
      </main>
    </div>
  );
}
