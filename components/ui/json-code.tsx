import type { ReactNode } from "react";

const jsonTokenPattern =
  /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b/g;

function highlightJson(json: string) {
  const content: ReactNode[] = [];
  let cursor = 0;

  for (const match of json.matchAll(jsonTokenPattern)) {
    const index = match.index;

    if (index > cursor) {
      content.push(json.slice(cursor, index));
    }

    const className = match[1]
      ? "text-primary"
      : match[2]
        ? "text-emerald-700 dark:text-emerald-400"
        : match[3]
          ? "text-blue-700 dark:text-blue-300"
          : match[4]
            ? "font-medium text-amber-700 dark:text-amber-400"
            : "font-medium text-rose-700 dark:text-rose-400";

    content.push(
      <span className={className} key={`${index}-${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < json.length) {
    content.push(json.slice(cursor));
  }

  return content;
}

export function JsonCode({ label, value }: { label: string; value: unknown }) {
  const json = JSON.stringify(value, null, 2);

  return (
    <pre
      aria-label={label}
      className="max-h-[65vh] overflow-auto border-t border-border bg-muted/40 px-5 py-4 font-mono text-[13px] leading-6 break-words whitespace-pre-wrap text-muted-foreground outline-none selection:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6 sm:py-5"
      tabIndex={0}
    >
      <code>{highlightJson(json)}</code>
    </pre>
  );
}
