import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AssistantUsage } from "@/ui/assistant/assistant-usage";

test("Compass usage identifies sample figures before showing metrics", () => {
  render(<AssistantUsage />);
  expect(
    screen.getByRole("heading", { name: "Compass usage preview" }),
  ).toBeVisible();
  expect(
    screen.getByText(/These figures do not reflect your account/),
  ).toBeVisible();
  expect(screen.queryByText("Your activity over the last 7 days.")).toBeNull();
});
