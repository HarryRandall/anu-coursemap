import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceWording } from "@/ui/requirements/requirement-tree";

const wording =
  "Complete 48 units from the COMP2000 level courses listed below.";

test("the ANU source wording stays collapsed until a reader opens it", async () => {
  const user = userEvent.setup();
  render(<SourceWording text={wording} />);

  const summary = screen.getByText("ANU source wording");
  expect(screen.getByText(wording)).not.toBeVisible();

  await user.click(summary);
  expect(screen.getByText(wording)).toBeVisible();
});

test("a requirement can relabel its wording without losing the quotation", () => {
  render(<SourceWording text={wording} label="Rule as published" />);

  expect(screen.getByText("Rule as published")).toBeInTheDocument();
  expect(screen.getByText(wording).tagName).toBe("BLOCKQUOTE");
});
