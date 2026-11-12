import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import handler from "../.vercel/output/functions/__server.func/index.mjs";

// Exercise the generated Vercel Node function without deployment or credentials.
const server = createServer(handler);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const [path, expected] of [
    ["/api/health", 200],
    ["/api/openapi.json", 200],
    ["/api/api-docs/", 200],
    ["/api/tasks", 401],
    ["/api/unknown", 404],
    ["/", 200],
    ["/login", 200],
  ]) {
    // Model separate function invocations, each with its own incoming socket.
    const response = await fetch(origin + path, { headers: { connection: "close" } });
    assert.equal(response.status, expected, path);
    if (path === "/api/health") assert.equal((await response.json()).status, "ok");
    if (path === "/") assert.match(await response.text(), /Know what/);
    console.log(`${path}: ${response.status}`);
  }
  const config = JSON.parse(
    await readFile(
      new URL("../.vercel/output/functions/__server.func/.vc-config.json", import.meta.url),
    ),
  );
  assert.equal(config.runtime, "nodejs22.x");
  for (const asset of [
    "swagger-ui.css",
    "swagger-ui-bundle.js",
    "swagger-ui-standalone-preset.js",
  ]) {
    assert.ok(
      (await readFile(new URL(`../.vercel/output/static/api/api-docs/${asset}`, import.meta.url)))
        .length > 0,
    );
  }
  console.log("Vercel Node entry, API prefix, public SSR, JWT gate, and Swagger assets verified.");
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
