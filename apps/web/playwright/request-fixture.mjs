import { test as base } from "@playwright/test";

export const test = base.extend({
  request: async ({ request }, provide) => {
    await provide(async (url, init = {}) => {
      const response = await request.fetch(url, {
        method: init.method,
        headers: init.headers,
        data: init.body,
        maxRedirects: init.redirect === "manual" ? 0 : 20,
      });
      return {
        status: response.status(),
        ok: response.ok(),
        headers: new Headers(response.headers()),
        text: () => response.text(),
        json: () => response.json(),
        url: response.url(),
      };
    });
  },
});
