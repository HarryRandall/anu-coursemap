import { notFound } from "next/navigation";
import { IndoorMapEditor } from "@/components/admin/indoor-map-editor";
import { AppShell } from "@/components/shell";
import { canManageRooms } from "@/lib/auth/viewer";
import { loadIndoorMapEditorData } from "@/lib/rooms/indoor-map-admin";

export const dynamic = "force-dynamic";

export default async function AdminIndoorMapsPage() {
  if (!(await canManageRooms())) notFound();

  const { indoorMaps, mapData } = await loadIndoorMapEditorData();

  return (
    <AppShell admin fullBleed>
      <h1 className="sr-only">Indoor maps</h1>
      <IndoorMapEditor indoorMaps={indoorMaps} mapData={mapData} />
    </AppShell>
  );
}
