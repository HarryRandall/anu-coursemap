import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AssistantWorkspace } from "@/ui/assistant/assistant-workspace";

export default function CompassLoading() {
  return (
    <AssistantWorkspace loading>
      <div
        aria-busy="true"
        className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6"
      >
        <span className="sr-only">Loading Compass</span>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </AssistantWorkspace>
  );
}
