import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/supabase/config.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const {
  getCanonicalSiteOrigin,
  getSupabaseConfig,
  getSupabaseCookieOptions,
  isDemoMode,
} = await import(moduleUrl);

const origin = "http://127.0.0.1:3218";
const configVariableNames = [
  "COURSEMAP_DEMO_MODE",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "VERCEL",
];

function withEnvironment(overrides, callback) {
  const previous = new Map(
    configVariableNames.map((name) => [name, process.env[name]]),
  );

  configVariableNames.forEach((name) => {
    const value = overrides[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  });

  try {
    return callback();
  } finally {
    previous.forEach((value, name) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  }
}

test("enables demo mode only for exact true on a local origin", () => {
  for (const [value, expected] of [
    [undefined, false],
    ["", false],
    ["false", false],
    ["TRUE", false],
    [" true ", false],
    ["1", false],
    ["true", true],
  ]) {
    withEnvironment(
      {
        COURSEMAP_DEMO_MODE: value,
        NEXT_PUBLIC_SITE_URL: origin,
        VERCEL: undefined,
      },
      () => assert.equal(isDemoMode(), expected, String(value)),
    );
  }

  withEnvironment(
    {
      COURSEMAP_DEMO_MODE: "true",
      NEXT_PUBLIC_SITE_URL: "https://coursemap.example",
      VERCEL: undefined,
    },
    () => assert.equal(isDemoMode(), false),
  );
  withEnvironment(
    {
      COURSEMAP_DEMO_MODE: "true",
      NEXT_PUBLIC_SITE_URL: origin,
      VERCEL: "1",
    },
    () => assert.equal(isDemoMode(), false),
  );
});

test("parses only complete HTTP Supabase configuration", () => {
  const cases = [
    [{}, null],
    [{ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }, null],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "ftp://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "not a URL",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://user:password@example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " publishable-key ",
      },
      {
        url: "https://example.supabase.co",
        publishableKey: "publishable-key",
      },
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-key",
      },
      {
        url: "http://127.0.0.1:54321",
        publishableKey: "local-key",
      },
    ],
  ];

  for (const [environment, expected] of cases) {
    withEnvironment(environment, () => {
      assert.deepEqual(getSupabaseConfig(), expected);
    });
  }
});

test("accepts only HTTPS or loopback canonical origins", () => {
  const cases = [
    [undefined, null],
    ["not a URL", null],
    ["http://coursemap.example", null],
    ["http://localhost:3000", "http://localhost:3000"],
    ["http://localhost:3000/", "http://localhost:3000"],
    ["http://127.0.0.1:3218/", origin],
    ["https://coursemap.example", "https://coursemap.example"],
    ["https://coursemap.example/", "https://coursemap.example"],
    ["https://user:password@coursemap.example", null],
    ["https://coursemap.example/auth/callback", null],
    ["https://coursemap.example?next=/plan", null],
    ["https://coursemap.example#plan", null],
  ];

  for (const [value, expected] of cases) {
    withEnvironment({ NEXT_PUBLIC_SITE_URL: value }, () => {
      assert.equal(getCanonicalSiteOrigin(), expected, String(value));
    });
  }
});

test("uses secure auth cookies except on validated local HTTP", () => {
  for (const [siteUrl, secure] of [
    [undefined, true],
    ["https://coursemap.example", true],
    ["http://localhost:3000", false],
    [origin, false],
  ]) {
    withEnvironment({ NEXT_PUBLIC_SITE_URL: siteUrl }, () => {
      assert.deepEqual(getSupabaseCookieOptions(), {
        path: "/",
        sameSite: "lax",
        secure,
      });
    });
  }
});
