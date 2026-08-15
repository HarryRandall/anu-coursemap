import { AppShell } from "@/components/shell";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { parseRoadmapStage } from "@/lib/roadmap";

type RoadmapPageProps = {
  searchParams: Promise<{ stage?: string | string[] }>;
};

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const stage = parseRoadmapStage((await searchParams).stage);

  return (
    <AppShell title="Roadmap" subtitle="Where Coursemap is heading">
      <div className="mx-auto max-w-7xl">
        <RoadmapBoard stage={stage} />
      </div>
    </AppShell>
  );
}
