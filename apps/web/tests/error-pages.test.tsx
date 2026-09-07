import { expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";
import NotFound from "@/app/not-found";

test("missing pages have one heading and useful routes home and to the catalogue", () => {
  render(<NotFound />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByText("404 · Page not found")).toBeVisible();
  expect(screen.getByRole("link", { name: "Coursemap home" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(screen.getByRole("link", { name: "Browse courses" })).toHaveAttribute(
    "href",
    "/courses",
  );
});

test("retry resets the boundary while only the safe error reference is displayed", async () => {
  const reset = vi.fn();
  const error = Object.assign(
    new Error("Private database connection details"),
    { digest: "test-reference-123" },
  );
  render(<ErrorPage error={error} reset={reset} />);
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  expect(screen.getByText("Error reference: test-reference-123")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(reset).toHaveBeenCalledOnce();
});

test("client failures are not labelled as an HTTP server response", () => {
  render(
    <ErrorPage error={new Error("Client rendering failed")} reset={() => {}} />,
  );
  expect(screen.getByText("Page error")).toBeVisible();
  expect(screen.queryByText(/500/)).not.toBeInTheDocument();
});

test("an offline failure shows reconnect guidance and returns to the normal error when online", async () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const reset = vi.fn();
  try {
    render(<ErrorPage error={new Error("Failed to fetch")} reset={reset} />);
    expect(
      screen.getByRole("heading", { name: "You're a little out of reach" }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    online.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("online")));
    expect(
      screen.getByRole("heading", { name: "We couldn't load this page" }),
    ).toBeVisible();
  } finally {
    online.mockRestore();
  }
});
