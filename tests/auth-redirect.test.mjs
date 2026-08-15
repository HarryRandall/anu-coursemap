import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/auth/redirect.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { safeInternalRedirect } = await import(moduleUrl);

test("keeps valid internal authentication destinations", () => {
  const cases = [
    "/plan",
    "/courses/COMP2100",
    "/courses?query=software%20design",
    "/requirements#major",
  ];

  cases.forEach((candidate) => {
    assert.equal(safeInternalRedirect(candidate), candidate);
  });
});

test("rejects external, decoded and handler redirect destinations", () => {
  const unsafe = [
    null,
    "",
    "plan",
    "https://evil.example/plan",
    "//evil.example/plan",
    "///evil.example/plan",
    "/\\evil.example/plan",
    "/%5c%5cevil.example/plan",
    "/%255c%255cevil.example/plan",
    "/%2f%2fevil.example/plan",
    "/%252f%252fevil.example/plan",
    "/%0aplan",
    "/auth/callback",
    "/auth/callback/again",
    "/AUTH/CONFIRM",
    "/auth/%63allback",
    "/auth/%2563allback",
    "/auth/confirm?token_hash=secret",
    "/auth/callback%3Fcode=secret",
    "/auth/callback%23fragment",
    "/auth/logout",
  ];

  unsafe.forEach((candidate) => {
    assert.equal(
      safeInternalRedirect(candidate),
      "/dashboard",
      `expected ${String(candidate)} to be rejected`,
    );
  });
});

test("uses the supplied fallback for unsafe destinations", () => {
  assert.equal(safeInternalRedirect("//evil.example", "/courses"), "/courses");
});
