import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import mongoose from "mongoose";
import { connectDatabase } from "../db.js";
const server = app.listen(0, "127.0.0.1");
after(() => server.close());
async function request(path, init) {
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}
test("importing app does not listen; health and docs do not require MongoDB", async () => {
  assert.equal(typeof app, "function");
  assert.equal((await request("/health")).status, 200);
  const spec = await request("/openapi.json");
  assert.equal(spec.status, 200);
  assert.equal((await spec.json()).openapi, "3.0.0");
  const docs = await request("/api-docs/");
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /SwaggerUIBundle/);
});
test("task endpoints reject missing and invalid JWTs without a database", async () => {
  assert.equal((await request("/tasks")).status, 401);
  assert.equal(
    (await request("/tasks", { headers: { authorization: "Bearer invalid" } })).status,
    401,
  );
});
test("CORS and JSON 404 behavior remain available", async () => {
  const response = await request("/health", { headers: { origin: "http://localhost:8080" } });
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    process.env.FRONTEND_URL || "http://localhost:8080",
  );
  const missing = await request("/not-found");
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).message, "API route not found");
});
test("warm invocations reuse one connection attempt and retry a failed one", async () => {
  const original = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "mongodb://placeholder.invalid/test";
  let reject;
  const connect = mock.method(
    mongoose,
    "connect",
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  try {
    const first = connectDatabase();
    const second = connectDatabase();
    assert.equal(connect.mock.callCount(), 1);
    reject(new Error("test failure"));
    await assert.rejects(first);
    await assert.rejects(second);
    const retry = connectDatabase();
    assert.equal(connect.mock.callCount(), 2);
    reject(new Error("test failure"));
    await assert.rejects(retry);
  } finally {
    connect.mock.restore();
    if (original === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = original;
  }
});
test("same-origin LAN requests use the incoming host rather than a fixed frontend origin", async () => {
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await request("/health", { headers: { origin } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
});
