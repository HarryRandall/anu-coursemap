import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { EffectiveStatus } from "@/lib/planner";

export type AttentionItem = {
  id: string;
  code: string;
  name: string;
  termLabel: string;
  status: EffectiveStatus;
  note: string;
};

export function AttentionCard({ items }: { items: AttentionItem[] }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Needs attention</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {items.length === 0
            ? "Everything in your plan is on track"
            : `${items.length} ${items.length === 1 ? "item" : "items"} from your plan`}
        </p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <CircleCheck size={22} className="text-emerald-600" aria-hidden />
          <p className="text-sm font-medium text-zinc-700">
            Nothing needs attention
          </p>
          <p className="max-w-[16rem] text-[11px] text-zinc-500">
            No blocked courses or outstanding approvals in your plan.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-semibold text-zinc-900">
                    <span className="font-mono">{item.code}</span>
                    <span className="ml-1.5 font-normal text-zinc-500">
                      {item.termLabel}
                    </span>
                  </p>
                  <StatusPill status={item.status} className="shrink-0" />
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-zinc-600">
                  {item.note}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/plan"
            className="mt-auto pt-4 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Fix these in your plan
          </Link>
        </>
      )}
    </Card>
  );
}
