import { CourseCatalogue } from "./course-catalogue";

type CoursesPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const query = (await searchParams).q;
  const initialQuery = (Array.isArray(query) ? query[0] : query)
    ?.trim()
    .slice(0, 120);

  return <CourseCatalogue initialQuery={initialQuery ?? ""} />;
}
