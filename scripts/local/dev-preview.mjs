import { spawn, spawnSync } from "node:child_process";

export function parseSupabaseEnvironment(output) {
  const values = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(?:"([^"]*)"|(.*))$/);
    if (match) values.set(match[1], match[2] ?? match[3] ?? "");
  }

  return {
    apiUrl: values.get("API_URL"),
    publishableKey: values.get("PUBLISHABLE_KEY") ?? values.get("ANON_KEY"),
    secretKey: values.get("SECRET_KEY") ?? values.get("SERVICE_ROLE_KEY"),
  };
}

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

  const { apiUrl, publishableKey, secretKey } = parseSupabaseEnvironment(
    result.stdout,
  );
  if (!apiUrl || !publishableKey || !secretKey) {
    console.error(
      "Supabase did not return its local API URL, public key and server key.",
    );
    process.exit(1);
  }

  return { apiUrl, publishableKey, secretKey };
}

const { apiUrl, publishableKey, secretKey } = readSupabaseEnvironment();
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
      SUPABASE_SECRET_KEY: secretKey,
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
