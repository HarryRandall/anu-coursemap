"use client";

import { useMemo, useState } from "react";
import type { Selection, SortDescriptor } from "react-aria-components";
import { SearchLg } from "@untitledui/icons";
import { EmptyState } from "@uui/components/application/empty-state/empty-state";
import { PaginationCardMinimal } from "@uui/components/application/pagination/pagination";
import { TableCard } from "@uui/components/application/table/table";
import { Button } from "@uui/components/base/buttons/button";
import {
  ButtonGroup,
  ButtonGroupItem,
} from "@uui/components/base/button-group/button-group";
import {
  BulkActionBar,
  FilterBar,
} from "@/components/design-system/coursemap/filter-bar";
import { SkeletonTableRows } from "@/components/design-system/coursemap/skeleton";
import {
  CardTable,
  FlushTable,
  GroupedTable,
  RichRowsTable,
  ZebraTable,
  tableVariantIds,
  tableVariantLabels,
  type TableVariantId,
} from "@/components/design-system/coursemap/table-variants";
import { courses, sessions, statusLabels } from "../content";
import type { CourseStatus } from "../content";
import { Example, Stack } from "../section-frame";

const statusOptions = (Object.keys(statusLabels) as CourseStatus[]).map(
  (status) => ({ id: status, label: statusLabels[status] }),
);

const sessionOptions = sessions.map((session) => ({
  id: session.id,
  label: session.label,
}));

function CourseTable() {
  const [variant, setVariant] = useState<Set<string>>(() => new Set(["card"]));
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Selection>(() => new Set());
  const [session, setSession] = useState<string | number | null>(null);
  const [selected, setSelected] = useState<Selection>(() => new Set());
  const [sort, setSort] = useState<SortDescriptor>({
    column: "code",
    direction: "ascending",
  });
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [lastAction, setLastAction] = useState<string | null>(null);

  const current = ([...variant][0] ?? "card") as TableVariantId;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const statusSet =
      statuses === "all"
        ? new Set(statusOptions.map((option) => option.id))
        : statuses;
    const sessionLabel = sessionOptions.find(
      (option) => option.id === session,
    )?.label;

    const filtered = courses.filter((course) => {
      if (removed.has(course.id)) return false;
      if (
        needle &&
        !course.code.toLowerCase().includes(needle) &&
        !course.title.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (statusSet.size > 0 && !statusSet.has(course.status)) return false;
      if (sessionLabel && course.session !== sessionLabel) return false;
      return true;
    });

    const column = String(sort.column);
    const sorted = [...filtered].sort((a, b) => {
      const left =
        column === "units" ? a.units : String(a[column as keyof typeof a]);
      const right =
        column === "units" ? b.units : String(b[column as keyof typeof b]);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });

    return sort.direction === "descending" ? sorted.reverse() : sorted;
  }, [query, statuses, session, sort, removed]);

  const selectedCount =
    selected === "all" ? rows.length : (selected as Set<string>).size;

  const resetFilters = () => {
    setQuery("");
    setStatuses(new Set());
    setSession(null);
  };

  const selectedIds = () =>
    selected === "all"
      ? rows.map((row) => row.id)
      : [...(selected as Set<string>)].map(String);

  const selectedCodes = () => {
    const ids = new Set(selectedIds());
    return courses
      .filter((course) => ids.has(course.id))
      .map((course) => course.code);
  };

  const shared = {
    rows,
    selected,
    onSelectionChange: setSelected,
    sort,
    onSortChange: setSort,
  };

  const controls = (
    <>
      <FilterBar
        query={query}
        onQueryChange={setQuery}
        statuses={statuses}
        statusOptions={statusOptions}
        onStatusesChange={setStatuses}
        session={session}
        sessionOptions={sessionOptions}
        onSessionChange={setSession}
        onReset={resetFilters}
        resultCount={rows.length}
        totalCount={courses.length - removed.size}
      />

      <BulkActionBar
        count={selectedCount}
        onClear={() => setSelected(new Set())}
        onAddToPlan={() => {
          setLastAction(`Added ${selectedCodes().join(", ")} to the plan.`);
          setSelected(new Set());
        }}
        onExport={() => setLastAction(`Exported ${selectedCount} rows as CSV.`)}
        onRemove={() => {
          const ids = selectedIds();
          const codes = selectedCodes();
          setRemoved((current) => new Set([...current, ...ids]));
          setLastAction(`Removed ${codes.join(", ")} from the catalogue.`);
          setSelected(new Set());
        }}
      />
    </>
  );

  const empty = (
    <div className="px-4 py-10">
      <EmptyState size="sm" className="relative isolate overflow-hidden py-4">
        <EmptyState.Header pattern="circle">
          <EmptyState.FeaturedIcon color="gray" icon={SearchLg} />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>No courses match</EmptyState.Title>
          <EmptyState.Description>
            Nothing in the 2026 catalogue matches the current search and
            filters.
          </EmptyState.Description>
        </EmptyState.Content>
        <EmptyState.Footer>
          <Button color="secondary" onClick={resetFilters}>
            Clear filters
          </Button>
          {removed.size > 0 && (
            <Button onClick={() => setRemoved(new Set())}>
              Restore removed courses
            </Button>
          )}
        </EmptyState.Footer>
      </EmptyState>
    </div>
  );

  const body = () => {
    if (rows.length === 0) return empty;

    switch (current) {
      case "flush":
        return <FlushTable {...shared} />;
      case "zebra":
        return <ZebraTable {...shared} />;
      case "rich":
        return <RichRowsTable {...shared} />;
      case "grouped":
        return <GroupedTable {...shared} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="relative -mr-4 overflow-hidden pr-4 sm:mr-0 sm:pr-0">
          <ButtonGroup
            size="sm"
            className="w-full max-w-full snap-x [scrollbar-width:none] overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
            selectedKeys={variant}
            onSelectionChange={(keys) => {
              const next = new Set([...keys].map(String));
              if (next.size > 0) setVariant(next);
            }}
          >
            {tableVariantIds.map((id) => (
              <ButtonGroupItem key={id} id={id} className="snap-start">
                {tableVariantLabels[id].title}
              </ButtonGroupItem>
            ))}
          </ButtonGroup>
          <span
            aria-hidden="true"
            className="from-secondary_alt pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l to-transparent sm:hidden"
          />
        </div>
        <p className="text-tertiary text-sm">
          {tableVariantLabels[current].summary}
        </p>
      </div>

      {current === "card" ? (
        <CardTable
          {...shared}
          header={
            <>
              <TableCard.Header
                title="2026 course catalogue"
                badge={`${rows.length} courses`}
                description="Sort by any column, filter, select rows and run a bulk action."
                contentTrailing={
                  <Button size="sm" color="secondary">
                    Export
                  </Button>
                }
              />
              {controls}
            </>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
            {controls}
          </div>
          {body()}
        </div>
      )}

      {current === "card" && rows.length === 0 && empty}

      {current === "card" && rows.length > 0 && (
        <PaginationCardMinimal
          page={1}
          total={1}
          onPageChange={() => {}}
          className="rounded-xl bg-primary ring-1 ring-secondary"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-tertiary text-sm">
          {lastAction ??
            "Filters, sorting, selection and bulk actions are shared across every variant, so switching does not reset your state."}
        </p>
        {removed.size > 0 && (
          <Button
            size="sm"
            color="secondary"
            onClick={() => setRemoved(new Set())}
          >
            Restore {removed.size} removed course
            {removed.size === 1 ? "" : "s"}
          </Button>
        )}
      </div>
    </div>
  );
}

function LoadingTable() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="sm"
        color="secondary"
        className="self-start"
        onClick={() => setLoading((value) => !value)}
      >
        {loading ? "Finish loading" : "Load again"}
      </Button>

      {loading ? (
        <SkeletonTableRows rows={5} />
      ) : (
        <RichRowsTable
          rows={courses.slice(0, 5)}
          selected={new Set()}
          onSelectionChange={() => {}}
          sort={{ column: "code", direction: "ascending" }}
          onSortChange={() => {}}
        />
      )}
    </div>
  );
}

export function TablesSection() {
  return (
    <Stack>
      <Example
        title="Five anatomies, one behaviour"
        bare
        description="Switch between the five options. All of them share the same filtering, sorting, selection and bulk actions, so the decision is about appearance and density, not capability."
      >
        <CourseTable />
      </Example>

      <Example
        title="Loading"
        description="A skeleton shaped to the row geometry, so the table does not jump when data lands."
        bare
      >
        <LoadingTable />
      </Example>
    </Stack>
  );
}
