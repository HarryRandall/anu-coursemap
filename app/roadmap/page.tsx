import { AppShell } from "@/components/shell";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { parseRoadmapArea, parseRoadmapYear } from "@/lib/roadmap";

type RoadmapPageProps = {
  searchParams: Promise<{ area?: string | string[]; year?: string | string[] }>;
};

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const params = await searchParams;
  const area = parseRoadmapArea(params.area);
  const year = parseRoadmapYear(params.year);

  return (
    <AppShell title="Roadmap" subtitle="Where Coursemap is heading">
      <div className="mx-auto max-w-7xl">
        <RoadmapBoard area={area} year={year} />
      </div>
    </AppShell>
  );
}
