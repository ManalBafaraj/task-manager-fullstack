import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer as createViteServer } from "vite";
import { loadLocalEnvironment } from "../local-env.js";

test("local API environment loads in its own process and preserves injected variables", async () => {
  const file = join(tmpdir(), `taskflow-env-${randomUUID()}.env`);
  const key = "TASKFLOW_LOCAL_ENV_REGRESSION";
  const original = process.env[key];
  try {
    await writeFile(file, `${key}=local-fixture\n`, { flag: "wx" });
    delete process.env[key];
    loadLocalEnvironment(pathToFileURL(file));
    assert.equal(process.env[key], "local-fixture");
    process.env[key] = "injected-fixture";
    loadLocalEnvironment(pathToFileURL(file));
    assert.equal(process.env[key], "injected-fixture");
  } finally {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
    await unlink(file);
  }
});

test("backend modules import as native ESM without starting a listener", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  assert.equal(manifest.type, "module");
  const [{ default: app }, { connectDatabase }, { default: spec }] = await Promise.all([
    import("../app.js"),
    import("../db.js"),
    import("../swagger.js"),
  ]);
  assert.equal(typeof app, "function");
  assert.equal(typeof connectDatabase, "function");
  assert.equal(spec.openapi, "3.0.0");
});

test("Vite SSR imports the real API entry and serves health without CommonJS globals", async () => {
  const vite = await createViteServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    configFile: false,
    appType: "custom",
    server: { middlewareMode: true, watch: null, ws: false },
  });
  let server;
  try {
    // Native Node import of a CommonJS backend alone would miss this regression:
    // Vite evaluates local source modules as ESM on the frontend's dev SSR path.
    const { default: api } = await vite.ssrLoadModule("/server/api.ts");
    assert.equal(typeof api, "function");
    server = createHttpServer(api);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${origin}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    assert.equal((await fetch(`${origin}/api/tasks`)).status, 401);
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await vite.close();
  }
});
