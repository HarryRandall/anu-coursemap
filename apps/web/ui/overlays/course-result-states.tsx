"use client";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coursemap/ui/primitives/empty";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AlertCircle } from "lucide-react";

export function CourseResultSkeleton() {
  return (
    <div className="space-y-1 p-2" aria-label="Searching courses" role="status">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Searching courses...</span>
    </div>
  );
}
export function SearchFailure() {
  return (
    <Empty className="min-h-full !rounded-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle>Course search is unavailable</EmptyTitle>
        <EmptyDescription>Try the search again in a moment.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
