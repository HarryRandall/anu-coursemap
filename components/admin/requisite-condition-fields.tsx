"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { Input, inputClasses, Select } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const KIND_OPTIONS = CONDITION_FAMILY_KINDS.map((kind) => ({
  value: kind,
  label: CONDITION_KIND_LABELS[kind],
}));

const inlineControl =
  "!h-10 min-h-10 w-auto min-w-[7.5rem] rounded-md px-2.5 text-[13px] font-medium shadow-none";

const COURSE_MATCH_OPTIONS: Array<{
  value: CourseMatch;
  label: string;
}> = [
  { value: "completed", label: "Completed" },
  { value: "not_completed", label: "Not completed" },
  { value: "mark", label: "Minimum mark" },
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

  useEffect(() => {
    if (!isOpen) return;
    const term = query.trim();
    if (term.length < 2) return;
    const timeout = window.setTimeout(() => {
      void onSearch(term).then(setResults);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [onSearch, isOpen, query]);

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
            <span className="truncate font-mono text-[13px] font-semibold">
              {value}
            </span>
          ) : (
            <span className="truncate text-zinc-400">
              Search {label.toLowerCase()}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="ml-auto shrink-0 text-zinc-400"
            size={15}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command label={label} shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
          />
          <CommandList className="max-h-64">
            <CommandEmpty>
              {query.trim().length < 2 ? "Type a code or title." : empty}
            </CommandEmpty>
            <CommandGroup>
              {(query.trim().length < 2 ? [] : results).map((result) => (
                <CommandItem
                  key={result.code}
                  onSelect={() => {
                    onSelect(result.code, result.title);
                    setIsOpen(false);
                  }}
                  value={`${result.code} ${result.title ?? ""}`}
                >
                  <span className="font-mono text-sm font-semibold">
                    {result.code}
                  </span>
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
    return [{ value: "enrolled", label: "Enrolled in" }];
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
      <span className="text-sm text-zinc-500">units</span>
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
}: {
  bindOpen: (key: string) => OpenBind;
  condition: ReviewedConditionNode;
  onChange: (next: ReviewedConditionNode) => void;
}) {
  const fieldId = useId();

  if (condition.kind === "course" || condition.kind === "incompatible") {
    return (
      <>
        <SearchPicker
          className={cn(inlineControl, "min-w-[8rem]")}
          empty="No courses match."
          label="Course"
          onSearch={searchCourses}
          onSelect={(code, title) =>
            onChange({ ...condition, courseCode: code, courseTitle: title })
          }
          value={condition.courseCode ?? ""}
          {...bindOpen("course")}
        />
        {condition.kind === "course" && condition.mark != null ? (
          <Input
            aria-label="Minimum mark"
            className={cn(inlineControl, "w-20 min-w-20")}
            max={100}
            min={0}
            onChange={(event) =>
              onChange({
                ...condition,
                mark:
                  event.target.value === "" ? 0 : Number(event.target.value),
              })
            }
            step="1"
            type="number"
            value={condition.mark}
          />
        ) : null}
      </>
    );
  }

  if (condition.kind === "admission") {
    return (
      <SearchPicker
        className={cn(inlineControl, "min-w-[8rem]")}
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
        <span className="text-sm text-zinc-500">of</span>
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
        <span className="text-sm text-zinc-500">at</span>
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
        <span className="text-sm text-zinc-500">in</span>
        <Input
          aria-label="Discipline, optional"
          className={cn(inlineControl, "w-40 min-w-40")}
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

  return (
    <Input
      aria-label={
        condition.kind === "permission" ? "Who must approve" : "Wording"
      }
      className={cn(inlineControl, "min-w-[14rem]")}
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
  condition,
  onChange,
  onKindChange,
  singleLine = false,
}: {
  condition: ReviewedConditionNode;
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

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1",
        singleLine ? "flex-nowrap" : "flex-wrap",
      )}
    >
      <Select
        aria-label="Condition type"
        className={inlineControl}
        onChange={onKindChange}
        options={KIND_OPTIONS}
        value={family}
        {...bindOpen("family")}
      />
      {family === "course" || family === "admission" ? (
        <span className="px-0.5 text-sm text-zinc-500">name is</span>
      ) : family === "permission" || family === "other" ? null : (
        <span className="px-0.5 text-sm text-zinc-500">is</span>
      )}
      {family === "course" ? (
        <Select
          aria-label="Status"
          className={inlineControl}
          onChange={(next) => onChange(applyCourseMatch(condition, next))}
          options={COURSE_MATCH_OPTIONS}
          value={courseMatch(condition)}
          {...bindOpen("match")}
        />
      ) : (
        <Select
          aria-label="How this condition matches"
          className={inlineControl}
          onChange={() => undefined}
          options={middle}
          value={middle[0]?.value ?? "at_least"}
          {...bindOpen("middle")}
        />
      )}
      <InlineValueFields
        bindOpen={bindOpen}
        condition={condition}
        onChange={onChange}
      />
    </span>
  );
}
