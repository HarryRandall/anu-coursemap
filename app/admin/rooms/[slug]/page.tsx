import { notFound } from "next/navigation";
import { IndoorEditor } from "@/components/admin/rooms/indoor-editor";
import { canManageRooms } from "@/lib/auth/viewer";
import { loadIndoorMapForBuilding } from "@/lib/rooms/indoor-map-admin";

export const dynamic = "force-dynamic";

export default async function AdminRoomEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await canManageRooms())) notFound();

  const { slug } = await params;
  const data = await loadIndoorMapForBuilding(slug);
  if (!data) notFound();

  return (
    <IndoorEditor
      building={data.building}
      mapData={data.mapData}
      record={data.record}
    />
  );
}
