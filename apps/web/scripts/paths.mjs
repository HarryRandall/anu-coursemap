import { fileURLToPath } from "node:url";
export const appRoot = fileURLToPath(new URL("../", import.meta.url));
export const repositoryRoot = fileURLToPath(
  new URL("../../../", import.meta.url),
);
