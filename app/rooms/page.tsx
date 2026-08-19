import {
  Accessibility,
  ArrowRight,
  Building2,
  UsersRound,
  Wifi,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const plannedDetails = [
  {
    icon: Building2,
    title: "Building and room search",
    description: "Find a campus room by name, code or nearby building.",
  },
  {
    icon: UsersRound,
    title: "Capacity and room type",
    description: "See whether a space suits a class, meeting or quiet study.",
  },
  {
    icon: Wifi,
    title: "Facilities",
    description:
      "Check for displays, computers, power and other useful equipment.",
  },
  {
    icon: Accessibility,
    title: "Accessible routes",
    description: "Surface accessibility details alongside directions.",
  },
];

export default function RoomsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Card className="overflow-hidden">
          <h1 className="sr-only">Room finder</h1>
          <div className="grid gap-px bg-zinc-100 sm:grid-cols-2">
            {plannedDetails.map((item) => {
              const Icon = item.icon;
              return (
                <section key={item.title} className="bg-white p-5 sm:p-6">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon size={17} />
                  </span>
                  <h2 className="mt-3 text-sm font-semibold text-zinc-900">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {item.description}
                  </p>
                </section>
              );
            })}
          </div>
        </Card>

        <Card className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Looking for your planned study periods?
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Calendar already shows where courses sit in your degree plan.
            </p>
          </div>
          <ButtonLink href="/calendar" variant="secondary" size="sm">
            Open calendar <ArrowRight size={14} />
          </ButtonLink>
        </Card>
      </div>
    </AppShell>
  );
}
