import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { localTestEnvironment } from "../scripts/local/test-environment.mjs";

type Account = { email: string; password: string; id: string };
export const test = base.extend<{
  student: Account;
  administrator: Account;
  planner: Account;
}>({
  student: async ({}, provide) => {
    const env = localTestEnvironment();
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false } },
    );
    const email = `coursemap-test-${randomUUID()}@example.test`;
    const password = `Local-${randomUUID()}!`;
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user)
      throw error ?? new Error("Failed to create fixture account");
    try {
      await provide({ email, password, id: data.user.id });
    } finally {
      const result = await client.auth.admin.deleteUser(data.user.id);
      if (result.error) throw result.error;
    }
  },
  planner: async ({ student }, provide) => {
    const sql = postgres(localTestEnvironment().COURSEMAP_DATABASE_URL, {
      max: 1,
    });
    try {
      await sql`insert into public.plans (owner_id, academic_year_id, name, is_primary, commencement_year, study_load) select ${student.id}::uuid, id, 'Browser regression plan', true, 2026, 'full_time' from public.academic_years where year = 2026`;
      await provide(student);
    } finally {
      await sql.end();
    }
  },
  administrator: async ({ student }, provide) => {
    const sql = postgres(localTestEnvironment().COURSEMAP_DATABASE_URL, {
      max: 1,
    });
    try {
      await sql`insert into private.user_roles (user_id, role_id) select ${student.id}::uuid, id from private.app_roles where key = 'admin' on conflict (user_id) do update set role_id = excluded.role_id`;
      await provide(student);
    } finally {
      await sql.end();
    }
  },
});
export { expect };
export async function login(
  page: import("@playwright/test").Page,
  account: Account,
) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
