import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@coursemap/ui/primitives/tabs";
import { useState } from "react";
import { Button } from "@coursemap/ui/primitives/button";
import { Input } from "@coursemap/ui/primitives/input";
import { OptionPicker } from "@/ui/common/option-picker";
import { PreviewGrade } from "./preview-grade";
import {
  parsePreviewResult,
  specialResults,
  type PreviewCourse,
  type PreviewResult,
} from "./preview-data";

export function PreviewMarkEntry({
  courses,
  onRecord,
  onCancel,
  pending = false,
}: {
  courses: PreviewCourse[];
  onRecord: (code: string, result: PreviewResult) => void;
  onCancel?: () => void;
  pending?: boolean;
}) {
  const course = courses[0];
  const [kind, setKind] = useState<string>(course?.resultCode ?? "mark");
  const [mark, setMark] = useState(
    course?.mark === undefined
      ? course?.resultCode === "NCN"
        ? "0"
        : ""
      : String(course.mark),
  );
  const [error, setError] = useState("");
  if (!course)
    return (
      <p className="py-6 text-sm text-muted-foreground">No course selected.</p>
    );
  const parsed = parsePreviewResult(
    kind,
    kind === "NCN" && mark.trim() === "" ? "0" : mark,
  );
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        if (parsed.error) {
          setError(parsed.error);
          return;
        }
        if (parsed.result) onRecord(course.id ?? course.code, parsed.result);
      }}
    >
      <Tabs
        value={kind === "mark" ? "mark" : "code"}
        onValueChange={(value) => {
          setKind(value === "mark" ? "mark" : "PS");
          setError("");
        }}
      >
        <TabsList aria-label="Result entry method" className="w-full">
          <TabsTrigger value="mark" className="flex-1">
            Mark
          </TabsTrigger>
          <TabsTrigger value="code" className="flex-1">
            Result code
          </TabsTrigger>
        </TabsList>
        <TabsContent value={kind === "mark" ? "mark" : "code"}>
          {kind !== "mark" ? (
            <div className="mt-4 flex flex-col gap-3">
              <label
                id="preview-result-code-label"
                className="text-sm font-medium"
              >
                Result code
              </label>
              <OptionPicker
                aria-labelledby="preview-result-code-label"
                className="h-11 w-full px-3 py-0 text-base font-normal md:text-sm"
                value={kind === "mark" ? "PS" : kind}
                items={[...specialResults]}
                onValueChange={(value) => {
                  setKind(value);
                  if (value === "NCN") setMark("0");
                  setError("");
                }}
              />
            </div>
          ) : null}
          {kind === "mark" || kind === "NCN" ? (
            <div className="mt-4 flex flex-col gap-3">
              <label
                htmlFor="preview-final-mark"
                className="text-sm font-medium"
              >
                Final mark
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    id="preview-final-mark"
                    aria-label={`Final mark for ${course.code}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "preview-mark-error" : undefined}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={mark}
                    onChange={(event) => {
                      setMark(event.target.value);
                      setError(
                        parsePreviewResult(
                          kind,
                          kind === "NCN" && event.target.value.trim() === ""
                            ? "0"
                            : event.target.value,
                        ).error ?? "",
                      );
                    }}
                    placeholder={kind === "NCN" ? "0" : "0-100"}
                    onFocus={() => {
                      if (kind === "NCN" && mark === "0") setMark("");
                    }}
                    onBlur={() => {
                      if (kind === "NCN" && mark.trim() === "") setMark("0");
                    }}
                    className="h-11 px-3 py-0 pr-9 text-base font-normal md:text-sm"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
                  >
                    %
                  </span>
                </div>
                {kind === "mark" && parsed.result?.mark !== undefined ? (
                  <PreviewGrade mark={parsed.result.mark} />
                ) : null}
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      {error ? (
        <p
          id="preview-mark-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save result"}
        </Button>
      </div>
    </form>
  );
}
