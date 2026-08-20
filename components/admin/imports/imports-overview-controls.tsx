"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/field";

export function ImportsTableControls({
  searchPlaceholder,
  statuses,
}: {
  searchPlaceholder: string;
  statuses: Array<{ label: string; value: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = searchParams.get("status") ?? "all";

  function update(nextQuery: string, nextStatus: string) {
    const params = new URLSearchParams(searchParams.toString());
    const normalisedQuery = nextQuery.trim();
    if (normalisedQuery) params.set("q", normalisedQuery);
    else params.delete("q");
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");
    startTransition(() => {
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  }

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  return (
    <div
      className="flex flex-col gap-2 border-b border-zinc-200/80 bg-white p-3 sm:flex-row sm:items-center"
      aria-busy={isPending}
    >
      <label className="relative min-w-0 flex-1 sm:max-w-sm">
        <span className="sr-only">Search</span>
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          placeholder={searchPlaceholder}
          className="h-10 pl-9"
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (timeout.current) clearTimeout(timeout.current);
            timeout.current = setTimeout(() => update(value, status), 250);
          }}
        />
      </label>
      <Select
        value={status}
        onChange={(value) => update(query, value)}
        options={statuses}
        aria-label="Filter by status"
        className="h-10 sm:w-44"
      />
    </div>
  );
}
