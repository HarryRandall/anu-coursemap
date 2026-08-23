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
      ? "text-brand-700"
      : match[2]
        ? "text-emerald-700"
        : match[3]
          ? "text-blue-700"
          : match[4]
            ? "font-medium text-amber-700"
            : "font-medium text-rose-700";

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
      className="max-h-[65vh] overflow-auto border-t border-zinc-200 bg-zinc-50/60 px-5 py-4 font-mono text-[13px] leading-6 break-words whitespace-pre-wrap text-zinc-600 outline-none selection:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset sm:px-6 sm:py-5"
      tabIndex={0}
    >
      <code>{highlightJson(json)}</code>
    </pre>
  );
}
