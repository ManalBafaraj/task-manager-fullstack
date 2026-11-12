import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Local entry points only; deployed functions use injected environment variables.
export function loadLocalEnvironment(envFile = new URL(".env", import.meta.url)) {
  dotenv.config({ path: fileURLToPath(envFile), quiet: true });
}
