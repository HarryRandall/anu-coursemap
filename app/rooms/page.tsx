import {
  Accessibility,
  ArrowRight,
  Building2,
  MapPin,
  Search,
  UsersRound,
  Wifi,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
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
          <div className="bg-zinc-900 px-6 py-10 text-center text-white sm:px-10 sm:py-14">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/10">
              <MapPin size={22} />
            </span>
            <Badge className="mt-5 bg-white/10 text-white ring-white/15">
              Coming soon
            </Badge>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Find the right room, not just a room code
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
              Room Finder will connect class locations with useful campus
              details and directions. Coursemap will only publish room data once
              it has a dependable source.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink
                href="mailto:support@coursemap.app?subject=Coursemap%20Room%20Finder%20feedback"
                variant="secondary"
                className="border-0 bg-white text-zinc-900 hover:bg-zinc-100"
              >
                Share what you need <Search size={15} />
              </ButtonLink>
              <ButtonLink
                href="/roadmap"
                variant="ghost"
                className="text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                View roadmap <ArrowRight size={15} />
              </ButtonLink>
            </div>
          </div>

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
