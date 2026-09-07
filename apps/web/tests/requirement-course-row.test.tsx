import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@coursemap/ui/primitives/tooltip";
import { RequirementCourseRow } from "@/ui/requirements/requirement-course-row";

test("unimported courses explain their availability without linking to a 404", async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <TooltipProvider>
      <ul>
        <RequirementCourseRow
          code="BUSN1001"
          course={undefined}
          year={2026}
          status={null}
          onAdd={onAdd}
        />
      </ul>
    </TooltipProvider>,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  const course = screen.getByRole("button", {
    name: "BUSN1001: not available",
  });
  expect(course).toHaveAttribute("aria-disabled", "true");
  await user.tab();
  expect(course).toHaveFocus();
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Not available");
  await user.click(course);
  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
