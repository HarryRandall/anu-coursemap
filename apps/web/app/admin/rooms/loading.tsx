import { AppShell } from "@/ui/shell/app-shell";
import { BuildingPickerSkeleton } from "@/ui/admin/rooms/building-picker-skeleton";

export default function AdminRoomsLoading() {
  return (
    <AppShell loading fill admin fullBleed>
      <BuildingPickerSkeleton />
    </AppShell>
  );
}
