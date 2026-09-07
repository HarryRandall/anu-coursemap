import { LoaderCircle } from "lucide-react";

export function CampusMapLoading() {
  return (
    <div
      role="status"
      className="absolute inset-0 z-10 grid place-items-center bg-muted text-sm text-muted-foreground"
    >
      <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
        <LoaderCircle
          aria-hidden="true"
          className="motion-safe:animate-spin"
          size={16}
        />
        Loading map...
      </span>
    </div>
  );
}
