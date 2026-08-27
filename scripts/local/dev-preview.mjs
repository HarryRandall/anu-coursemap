import { spawn, spawnSync } from "node:child_process";

function readSupabaseEnvironment() {
  const result = spawnSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    console.error(
      "Local Supabase is unavailable. Run `npm run db:start` before `npm run dev:local`.",
    );
    process.exit(result.status ?? 1);
  }

  const values = new Map();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(?:"([^"]*)"|(.*))$/);
    if (match) values.set(match[1], match[2] ?? match[3] ?? "");
  }

  const apiUrl = values.get("API_URL");
  const publishableKey =
    values.get("PUBLISHABLE_KEY") ?? values.get("ANON_KEY");
  if (!apiUrl || !publishableKey) {
    console.error("Supabase did not return its local API URL and public key.");
    process.exit(1);
  }

  return { apiUrl, publishableKey };
}

const { apiUrl, publishableKey } = readSupabaseEnvironment();
const child = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"],
  {
    env: {
      ...process.env,
      COURSEMAP_DEMO_MODE: "false",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    },
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
