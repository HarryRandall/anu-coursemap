"use client";

import type { Selection } from "react-aria-components";
import { FilterLines, SearchLg, XClose } from "@untitledui/icons";
import { Button } from "@uui/components/base/buttons/button";
import { Input } from "@uui/components/base/input/input";
import { MultiSelect } from "@uui/components/base/select/multi-select";
import { Select } from "@uui/components/base/select/select";

/**
 * Adapted. Untitled UI's filter bar is PRO-only. This composes the free Input,
 * Select, MultiSelect and Button primitives into the pattern Coursemap already
 * uses above every list.
 */

export type FilterOption = { id: string; label: string };

export function FilterBar({
  query,
  onQueryChange,
  statuses,
  statusOptions,
  onStatusesChange,
  session,
  sessionOptions,
  onSessionChange,
  onReset,
  resultCount,
  totalCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  statuses: Selection;
  statusOptions: FilterOption[];
  onStatusesChange: (value: Selection) => void;
  session: string | number | null;
  sessionOptions: FilterOption[];
  onSessionChange: (value: string | number | null) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}) {
  const statusCount = statuses === "all" ? statusOptions.length : statuses.size;
  const filtered =
    query.trim().length > 0 || statusCount > 0 || session !== null;

  return (
    <div className="flex flex-col gap-3 border-b border-secondary p-4 md:flex-row md:items-end md:gap-4">
      <div className="min-w-0 flex-1">
        <Input
          size="md"
          aria-label="Search courses"
          placeholder="Search by code or title"
          icon={SearchLg}
          value={query}
          onChange={onQueryChange}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-56">
          <MultiSelect
            size="md"
            aria-label="Filter by status"
            placeholder="Any status"
            items={statusOptions}
            selectedKeys={statuses}
            onSelectionChange={onStatusesChange}
          >
            {(item) => (
              <MultiSelect.Item id={item.id}>{item.label}</MultiSelect.Item>
            )}
          </MultiSelect>
        </div>

        <div className="w-full sm:w-52">
          <Select
            size="md"
            aria-label="Filter by teaching period"
            placeholder="Any period"
            items={sessionOptions}
            selectedKey={session}
            onSelectionChange={onSessionChange}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </div>

        <Button
          size="md"
          color="secondary"
          iconLeading={filtered ? XClose : FilterLines}
          onClick={onReset}
          isDisabled={!filtered}
        >
          {filtered ? "Clear" : "Filters"}
        </Button>
      </div>

      <p className="text-tertiary shrink-0 text-sm md:pb-2.5">
        {resultCount} of {totalCount}
      </p>
    </div>
  );
}

export function BulkActionBar({
  count,
  onClear,
  onAddToPlan,
  onExport,
  onRemove,
}: {
  count: number;
  onClear: () => void;
  onAddToPlan: () => void;
  onExport: () => void;
  onRemove: () => void;
}) {
  if (count === 0) return null;

  return (
    <div
      role="status"
      className="bg-brand-primary flex flex-wrap items-center gap-3 border-b border-secondary px-4 py-3"
    >
      <p className="text-brand-secondary text-sm font-semibold">
        {count} course{count === 1 ? "" : "s"} selected
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button size="sm" color="secondary" onClick={onAddToPlan}>
          Add to plan
        </Button>
        <Button size="sm" color="secondary" onClick={onExport}>
          Export
        </Button>
        <Button size="sm" color="secondary-destructive" onClick={onRemove}>
          Remove
        </Button>
        <Button size="sm" color="link-gray" onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}
