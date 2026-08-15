import { Lightbulb } from "lucide-react";
import { AppShell } from "@/components/shell";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { parseRoadmapArea } from "@/lib/roadmap";

type RoadmapPageProps = {
  searchParams: Promise<{ area?: string | string[] }>;
};

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const area = parseRoadmapArea((await searchParams).area);

  return (
    <AppShell title="Roadmap" subtitle="Where Coursemap is heading">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Roadmap"
          meta="A public board for what has shipped, what is in flight and what is still an idea. Priorities can change as catalogue quality and student feedback improve."
          actions={
            <ButtonLink
              href="mailto:support@coursemap.app?subject=Coursemap%20feature%20request"
              variant="secondary"
            >
              Suggest a feature <Lightbulb size={15} aria-hidden="true" />
            </ButtonLink>
          }
        />
        <div className="mt-6">
          <RoadmapBoard area={area} />
        </div>
      </div>
    </AppShell>
  );
}
