"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  searchImportableCourses,
  searchImportableProgrammes,
  type ImportSearchResult,
  type ProgrammeImportSearchResult,
} from "@/lib/catalogue-import/search-actions";
import {
  applyCourseMatch,
  CONDITION_FAMILY_KINDS,
  CONDITION_KIND_LABELS,
  conditionFamily,
  courseMatch,
  type ConditionFamilyKind,
  type CourseMatch,
  type ReviewedConditionKind,
  type ReviewedConditionNode,
} from "@/lib/coursemap/requisite-conditions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input, inputClasses, Select, Textarea } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const KIND_OPTIONS = CONDITION_FAMILY_KINDS.map((kind) => ({
  value: kind,
  label:
    {
      course: "Course",
      admission: "Programme",
      units_total: "Total units",
      subject_units: "Subject units",
      level_units: "Level units",
      gpa: "Grade average",
      permission: "Permission",
      other: "Other wording",
    }[kind] ?? CONDITION_KIND_LABELS[kind],
}));

const inlineControl =
  "!h-9 min-h-9 w-auto min-w-[7.5rem] rounded-md px-2.5 text-xs font-medium text-zinc-700 shadow-none";

const stackedFamilyControl =
  "!h-10 min-h-10 w-full min-w-0 !rounded-none !border-transparent bg-transparent px-3 text-[13px] font-medium text-zinc-700 shadow-none max-md:!h-11 max-md:min-h-11";

const stackedMatchControl =
  "!h-10 min-h-10 w-full min-w-0 !rounded-none !border-transparent bg-transparent px-2.5 text-xs font-medium text-zinc-600 shadow-none max-md:!h-11 max-md:min-h-11";

const stackedValueCell =
  "flex min-h-10 min-w-0 flex-wrap items-center gap-1 px-2 py-1 text-xs text-zinc-600 max-md:min-h-11 [&_[data-slot=input]]:!h-8 [&_[data-slot=input]]:max-w-full [&_[data-slot=input]]:!border-transparent [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:text-xs [&_[data-slot=input]]:font-medium [&_[data-slot=input]]:text-zinc-700 [&_[data-slot=input]]:shadow-none [&_[data-slot=search-picker-trigger]]:!h-8 [&_[data-slot=search-picker-trigger]]:max-w-full [&_[data-slot=search-picker-trigger]]:!border-transparent [&_[data-slot=search-picker-trigger]]:bg-transparent [&_[data-slot=search-picker-trigger]]:text-xs [&_[data-slot=search-picker-trigger]]:text-zinc-700 [&_[data-slot=search-picker-trigger]]:shadow-none max-md:[&_[data-slot=search-picker-trigger]]:!h-10 max-md:[&_[data-slot=search-picker-trigger]]:!w-full max-md:[&_[data-slot=search-picker-trigger]]:!min-w-0 [&_[data-slot=select-trigger]]:!h-8 [&_[data-slot=select-trigger]]:max-w-full [&_[data-slot=select-trigger]]:!border-transparent [&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=select-trigger]]:text-xs [&_[data-slot=select-trigger]]:font-medium [&_[data-slot=select-trigger]]:text-zinc-700 [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=textarea]]:!border-transparent [&_[data-slot=textarea]]:bg-transparent [&_[data-slot=textarea]]:text-xs [&_[data-slot=textarea]]:text-zinc-700 [&_[data-slot=textarea]]:shadow-none";

const COURSE_MATCH_OPTIONS: Array<{
  value: CourseMatch;
  label: string;
}> = [
  { value: "completed", label: "Must be completed" },
  { value: "not_completed", label: "Must not be completed" },
  { value: "mark", label: "Mark of at least" },
];

/** ANU codes the year of a course in its level, from 1000 up to 9000. */
const COURSE_LEVELS = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

async function searchCourses(query: string) {
  const results: ImportSearchResult[] = await searchImportableCourses(query);
  return results.map((result) => ({
    code: result.code,
    title: result.title,
  }));
}

async function searchProgrammes(query: string) {
  const results: ProgrammeImportSearchResult[] =
    await searchImportableProgrammes(query);
  return results.map((result) => ({
    code: result.code,
    title: result.title,
  }));
}

function SearchPicker({
  className,
  empty,
  label,
  onOpenChange,
  onSearch,
  onSelect,
  open,
  value,
  valueTitle,
}: {
  className?: string;
  empty: string;
  label: string;
  onOpenChange?: (open: boolean) => void;
  onSearch: (
    query: string,
  ) => Promise<Array<{ code: string; title: string | null }>>;
  onSelect: (code: string, title: string | null) => void;
  open?: boolean;
  value: string;
  valueTitle?: string | null;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  function setIsOpen(next: boolean) {
    onOpenChange?.(next);
    if (open === undefined) setUncontrolledOpen(next);
  }
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ code: string; title: string | null }>
  >([]);
  const term = query.trim();
  const options =
    term.length < 2
      ? value
        ? [{ code: value, title: valueTitle ?? null }]
        : []
      : results;

  useEffect(() => {
    if (!isOpen) return;
    if (term.length < 2) return;
    const timeout = window.setTimeout(() => {
      void onSearch(term).then(setResults);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [onSearch, isOpen, term]);

  return (
    <Popover
      modal
      onOpenChange={(next) => {
        setIsOpen(next);
        if (next) setQuery("");
        else setResults([]);
      }}
      open={isOpen}
    >
      <PopoverTrigger asChild>
        <button
          data-slot="search-picker-trigger"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
          className={inputClasses(
            cn(
              "flex min-w-0 flex-1 cursor-pointer items-center justify-start text-left font-normal",
              className,
            ),
          )}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {value ? (
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 font-mono text-xs font-semibold text-zinc-700">
                {value}
              </span>
              {valueTitle ? (
                <span className="min-w-0 truncate text-[11px] font-normal text-zinc-500">
                  {valueTitle}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="truncate text-zinc-400">
              Choose {label.toLowerCase()}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="ml-auto shrink-0 text-zinc-400"
            size={15}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg p-1 shadow-xl md:w-[var(--radix-popover-trigger-width)]"
        sideOffset={4}
      >
        <Command label={label} shouldFilter={false}>
          <CommandInput
            className="h-9 text-xs"
            onValueChange={setQuery}
            placeholder="Search by code or title..."
            value={query}
            wrapperClassName="gap-2 px-2.5"
          />
          <CommandList className="max-h-56 p-1">
            {term.length < 2 && !value ? (
              <p className="px-2.5 py-2.5 text-xs text-zinc-500">
                Type a code or title.
              </p>
            ) : null}
            {term.length >= 2 ? (
              <CommandEmpty className="py-3 text-xs">{empty}</CommandEmpty>
            ) : null}
            <CommandGroup className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:gap-0.5">
              {options.map((result) => (
                <CommandItem
                  className="min-h-10 items-center gap-2 rounded-md px-2 py-1.5"
                  key={result.code}
                  onSelect={() => {
                    onSelect(result.code, result.title);
                    setIsOpen(false);
                  }}
                  value={`${result.code} ${result.title ?? ""}`}
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="shrink-0 font-mono text-xs font-semibold text-zinc-800">
                      {result.code}
                    </span>
                    {result.title ? (
                      <span className="min-w-0 truncate text-[11px] text-zinc-500">
                        {result.title}
                      </span>
                    ) : null}
                  </span>
                  {result.code === value ? (
                    <Check
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand-600"
                    />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function middleOptions(family: ConditionFamilyKind) {
  if (family === "course") return COURSE_MATCH_OPTIONS;
  if (family === "admission") {
    return [{ value: "enrolled", label: "Enrolment required" }];
  }
  if (family === "permission") {
    return [{ value: "required", label: "Required from" }];
  }
  if (family === "other") {
    return [{ value: "custom", label: "Described as" }];
  }
  return [{ value: "at_least", label: "At least" }];
}

function UnitsInput({
  condition,
  onChange,
}: {
  condition: ReviewedConditionNode;
  onChange: (next: ReviewedConditionNode) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Input
        aria-label="Units completed"
        className={cn(inlineControl, "w-[4.5rem] min-w-[4.5rem]")}
        min={0.5}
        onChange={(event) =>
          onChange({
            ...condition,
            units:
              event.target.value === "" ? null : Number(event.target.value),
          })
        }
        placeholder="6"
        step="0.5"
        type="number"
        value={condition.units ?? ""}
      />
      <span data-slot="condition-grammar" className="text-xs text-zinc-500">
        units
      </span>
    </span>
  );
}

function CourseMarkInput({
  condition,
  onChange,
}: {
  condition: ReviewedConditionNode;
  onChange: (next: ReviewedConditionNode) => void;
}) {
  if (condition.kind !== "course" || condition.mark == null) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        aria-label="Minimum mark"
        className={cn(inlineControl, "w-16 min-w-16")}
        max={100}
        min={0}
        onChange={(event) =>
          onChange({
            ...condition,
            mark: event.target.value === "" ? 0 : Number(event.target.value),
          })
        }
        step="1"
        type="number"
        value={condition.mark}
      />
      <span data-slot="condition-grammar" className="text-xs text-zinc-500">
        %
      </span>
    </span>
  );
}
type OpenBind = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function InlineValueFields({
  bindOpen,
  condition,
  onChange,
  stacked,
}: {
  bindOpen: (key: string) => OpenBind;
  condition: ReviewedConditionNode;
  onChange: (next: ReviewedConditionNode) => void;
  stacked: boolean;
}) {
  const fieldId = useId();

  if (condition.kind === "course" || condition.kind === "incompatible") {
    return (
      <SearchPicker
        className={cn(
          inlineControl,
          stacked ? "min-w-[8rem]" : "w-52 min-w-52",
        )}
        empty="No courses match."
        label="Course"
        onSearch={searchCourses}
        onSelect={(code, title) =>
          onChange({ ...condition, courseCode: code, courseTitle: title })
        }
        value={condition.courseCode ?? ""}
        valueTitle={condition.courseTitle}
        {...bindOpen("course")}
      />
    );
  }

  if (condition.kind === "admission") {
    return (
      <SearchPicker
        className={cn(
          inlineControl,
          stacked ? "min-w-[8rem]" : "w-52 min-w-52",
        )}
        empty="No programmes match."
        label="Programme"
        onSearch={searchProgrammes}
        onSelect={(code, title) =>
          onChange({
            ...condition,
            structureCode: code,
            structureName: title,
          })
        }
        value={condition.structureCode ?? condition.freeText ?? ""}
        valueTitle={condition.structureName}
        {...bindOpen("programme")}
      />
    );
  }

  if (condition.kind === "units_total") {
    return <UnitsInput condition={condition} onChange={onChange} />;
  }

  if (condition.kind === "subject_units") {
    return (
      <>
        <UnitsInput condition={condition} onChange={onChange} />
        <span data-slot="condition-grammar" className="text-xs text-zinc-500">
          in
        </span>
        <Input
          aria-label="Subject code"
          className={cn(inlineControl, "w-28 min-w-28")}
          id={`${fieldId}-subject`}
          maxLength={4}
          onChange={(event) =>
            onChange({
              ...condition,
              subjectCode: event.target.value.toUpperCase() || null,
            })
          }
          placeholder="COMP"
          value={condition.subjectCode ?? ""}
        />
      </>
    );
  }

  if (condition.kind === "level_units") {
    const level = condition.level ?? 0;
    const levels = COURSE_LEVELS.includes(level)
      ? COURSE_LEVELS
      : [...COURSE_LEVELS, level].filter(Boolean).sort((a, b) => a - b);
    return (
      <>
        <UnitsInput condition={condition} onChange={onChange} />
        <span data-slot="condition-grammar" className="text-xs text-zinc-500">
          at
        </span>
        <Select
          aria-label="Course level"
          className={cn(inlineControl, "min-w-[8rem]")}
          onChange={(next) => onChange({ ...condition, level: next })}
          options={levels.map((option) => ({
            value: option,
            label: `${option} level`,
          }))}
          placeholder="Level"
          value={level}
          {...bindOpen("level")}
        />
        <span data-slot="condition-grammar" className="text-xs text-zinc-500">
          in
        </span>
        <Input
          aria-label="Discipline, optional"
          className={cn(
            inlineControl,
            "w-40 min-w-40 max-md:w-full max-md:min-w-0",
          )}
          maxLength={4}
          onChange={(event) =>
            onChange({
              ...condition,
              subjectCode: event.target.value.toUpperCase() || null,
            })
          }
          placeholder="optional subject"
          value={condition.subjectCode ?? ""}
        />
      </>
    );
  }

  if (condition.kind === "gpa") {
    return (
      <Input
        aria-label="Minimum grade average"
        className={cn(inlineControl, "w-24 min-w-24")}
        max={7}
        min={0}
        onChange={(event) =>
          onChange({ ...condition, gpa: Number(event.target.value) })
        }
        placeholder="5.0"
        step="0.25"
        type="number"
        value={condition.gpa ?? ""}
      />
    );
  }

  if (condition.kind === "other" && stacked) {
    return (
      <Textarea
        aria-label="Wording"
        className="min-h-20 w-full min-w-0 resize-y border-transparent bg-transparent py-2 shadow-none"
        onChange={(event) =>
          onChange({ ...condition, freeText: event.target.value })
        }
        placeholder="Describe the condition"
        value={condition.freeText ?? ""}
      />
    );
  }

  return (
    <Input
      aria-label={
        condition.kind === "permission" ? "Who must approve" : "Wording"
      }
      className={cn(
        inlineControl,
        "min-w-[14rem] max-md:w-full max-md:min-w-0",
      )}
      onChange={(event) =>
        onChange({ ...condition, freeText: event.target.value })
      }
      placeholder={
        condition.kind === "permission"
          ? "Course convener"
          : "Describe the condition"
      }
      value={condition.freeText ?? ""}
    />
  );
}

/**
 * Three dropdowns on one row: what it is, how it matches, and the value.
 */
export function ConditionInlineEditor({
  className,
  condition,
  layout = "inline",
  onChange,
  onKindChange,
  singleLine = false,
}: {
  className?: string;
  condition: ReviewedConditionNode;
  layout?: "inline" | "stacked";
  onChange: (next: ReviewedConditionNode) => void;
  onKindChange: (kind: ReviewedConditionKind) => void;
  singleLine?: boolean;
}) {
  const family = conditionFamily(condition.kind);
  const middle = middleOptions(family);
  const [openField, setOpenField] = useState<string | null>(null);

  function bindOpen(key: string): OpenBind {
    return {
      open: openField === key,
      onOpenChange: (next) => setOpenField(next ? key : null),
    };
  }

  const familyControl = (
    <Select
      aria-label="Condition type"
      className={cn(
        inlineControl,
        layout === "stacked" && stackedFamilyControl,
      )}
      onChange={onKindChange}
      options={KIND_OPTIONS}
      value={family}
      {...bindOpen("family")}
    />
  );
  const matchControl =
    family === "course" ? (
      <Select
        aria-label="Course requirement"
        className={cn(
          inlineControl,
          layout === "stacked" && stackedMatchControl,
        )}
        onChange={(next) => onChange(applyCourseMatch(condition, next))}
        options={COURSE_MATCH_OPTIONS}
        value={courseMatch(condition)}
        {...bindOpen("match")}
      />
    ) : (
      <span
        aria-label={`Requirement: ${middle[0]?.label ?? "At least"}`}
        className={cn(
          "inline-flex h-9 min-h-9 min-w-[7.5rem] items-center rounded-md px-2.5 text-xs font-medium text-zinc-600",
          layout === "stacked" &&
            "h-10 min-h-10 w-full min-w-0 !rounded-none px-2.5 max-md:h-11 max-md:min-h-11",
        )}
      >
        {middle[0]?.label ?? "At least"}
      </span>
    );
  const values = (
    <InlineValueFields
      bindOpen={bindOpen}
      condition={condition}
      onChange={onChange}
      stacked={layout === "stacked"}
    />
  );
  const hasMark = condition.kind === "course" && condition.mark != null;
  const markControl = hasMark ? (
    <CourseMarkInput condition={condition} onChange={onChange} />
  ) : null;

  if (layout === "stacked") {
    return (
      <span
        className={cn(
          "grid w-full min-w-0 overflow-hidden rounded-xl border bg-white shadow-xs",
          className,
        )}
      >
        <span className="flex min-w-0 items-center border-b border-zinc-200">
          {familyControl}
        </span>
        {family === "course" ? (
          <span
            className={cn(
              "grid min-w-0",
              markControl
                ? "md:grid-cols-[minmax(12rem,1.4fr)_minmax(10rem,0.7fr)_5rem]"
                : "md:grid-cols-[minmax(12rem,1.4fr)_minmax(10rem,0.7fr)]",
            )}
          >
            <span
              className={cn(
                stackedValueCell,
                "border-b border-zinc-200 md:border-r md:border-b-0",
              )}
              data-slot="condition-value"
            >
              {values}
            </span>
            <span
              className={cn(
                "flex min-w-0 items-center",
                markControl &&
                  "border-b border-zinc-200 md:border-r md:border-b-0",
              )}
            >
              {matchControl}
            </span>
            {markControl ? (
              <span className={stackedValueCell}>{markControl}</span>
            ) : null}
          </span>
        ) : family === "admission" ? (
          <span className="grid min-w-0 md:grid-cols-[minmax(12rem,1.4fr)_minmax(10rem,0.7fr)]">
            <span
              className={cn(
                stackedValueCell,
                "border-b border-zinc-200 md:border-r md:border-b-0",
              )}
              data-slot="condition-value"
            >
              {values}
            </span>
            <span className="flex min-w-0 items-center">{matchControl}</span>
          </span>
        ) : (
          <span className="grid min-w-0 md:grid-cols-[minmax(8rem,0.65fr)_minmax(10rem,1.35fr)]">
            <span className="flex min-w-0 items-center border-b border-zinc-200 md:border-r md:border-b-0">
              {matchControl}
            </span>
            <span className={stackedValueCell} data-slot="condition-value">
              {values}
            </span>
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1",
        singleLine ? "flex-nowrap" : "flex-wrap",
        className,
      )}
    >
      {familyControl}
      {family === "course" || family === "admission" ? (
        <>
          {values}
          {matchControl}
          {markControl}
        </>
      ) : (
        <>
          {matchControl}
          {values}
        </>
      )}
    </span>
  );
}
