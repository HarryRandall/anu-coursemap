import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/auth/viewer", () => ({ getAuthContext: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveAcademicResult } from "@/lib/academic/actions";
beforeEach(() => {
  mocks.rpc.mockResolvedValue({
    error: { message: "Missing database function" },
  });
  mocks.auth.mockResolvedValue({ canAccessAdmin: false });
});
test("students never receive database error details", async () => {
  const result = await saveAcademicResult("id", "save", 80);
  expect(result.ok).toBe(false);
  expect(result.detail).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain("Missing database function");
});
test("administrators receive details alongside the friendly error", async () => {
  mocks.auth.mockResolvedValue({ canAccessAdmin: true });
  expect((await saveAcademicResult("id", "save", 80)).detail).toBe(
    "Missing database function",
  );
});
test("transport errors use the same safe response", async () => {
  mocks.rpc.mockRejectedValue(new Error("Internal address"));
  expect((await saveAcademicResult("id", "save", 80)).detail).toBeUndefined();
});
