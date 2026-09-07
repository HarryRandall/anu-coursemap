"use client";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { PlanBoard } from "@/ui/plan/plan-board";

export function PlanClient({ catalogue }: { catalogue: PlanCatalogue }) {
  return <PlanBoard catalogue={catalogue} />;
}

/** Single muted status mark - the only colour on the board. */
