import { AcademicDashboardMockup } from "@/components/design-system/coursemap/dashboard-mockup";
import { Example, Stack } from "../section-frame";

export function DashboardSection() {
  return (
    <Stack>
      <Example
        bare
        title="Academic overview"
        description="A high-fidelity dashboard concept using prototype student data. The composition is the proposal; none of the values or calculations are wired into production."
      >
        <AcademicDashboardMockup />
      </Example>
    </Stack>
  );
}
