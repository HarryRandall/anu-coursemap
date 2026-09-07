import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { BuildingPickerLayout } from "./building-picker-layout";

export function BuildingPickerSkeleton() {
  return (
    <BuildingPickerLayout
      loading
      rail={
        <>
          <div className="border-b border-border p-4">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="flex min-h-11 items-start gap-2 px-2.5 py-2"
              >
                <Skeleton className="size-4 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-5 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </>
      }
    >
      <span className="sr-only">Loading indoor maps</span>
      <Skeleton className="absolute inset-0 size-full rounded-none" />
      <div className="absolute top-3 right-3 space-y-2">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
      </div>
    </BuildingPickerLayout>
  );
}
