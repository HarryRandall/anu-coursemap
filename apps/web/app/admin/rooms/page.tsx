import { notFound } from "next/navigation";
import { BuildingPicker } from "@/ui/admin/rooms/building-picker";
import { AppShell } from "@/ui/shell/app-shell";
import { canManageRooms } from "@/lib/auth/viewer";
import { loadIndoorMapPickerData } from "@/lib/rooms/indoor-map-admin";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  if (!(await canManageRooms())) notFound();

  const { mapData, buildings, summaries } = await loadIndoorMapPickerData();

  return (
    <AppShell admin fill fullBleed>
      <h1 className="sr-only">Indoor maps</h1>
      <BuildingPicker
        buildings={buildings}
        mapData={mapData}
        summaries={summaries}
      />
    </AppShell>
  );
}
