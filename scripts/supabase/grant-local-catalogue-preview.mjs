#!/usr/bin/env node

import {
  assertVerifiedLocalDatabaseClient,
  createLocalDatabaseClient,
} from "../catalogue/lib/local-database.mjs";

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
  console.error("Usage: npm run db:grant-preview -- user@example.com");
  process.exitCode = 2;
} else {
  const sql = await createLocalDatabaseClient();
  try {
    assertVerifiedLocalDatabaseClient(sql);
    const result = await sql.begin("read write", async (transaction) => {
      const [user] = await transaction`
        select id
        from auth.users
        where lower(email) = ${email}
        limit 1
      `;
      if (!user) throw new Error(`No local Auth user exists for ${email}.`);

      const [role] = await transaction`
        select id
        from private.app_roles
        where key = 'catalogue_previewer'
      `;
      if (!role) throw new Error("The catalogue previewer role is missing.");

      await transaction`
        insert into private.user_roles (user_id, role_id, granted_by)
        values (${user.id}, ${role.id}, ${user.id})
        on conflict (user_id, role_id) do nothing
      `;
      return user.id;
    });
    console.log(
      `Granted local draft catalogue access to ${email} (${result}).`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
