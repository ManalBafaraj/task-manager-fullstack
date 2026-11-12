import { test, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app, { User, Task } from "../app.js";
const secret = "test-only-not-a-production-secret";
process.env.JWT_SECRET = secret;
const owner = "507f1f77bcf86cd799439011";
const other = "507f1f77bcf86cd799439012";
const account = { _id: owner, name: "Test Person", email: "test@example.test", tokenVersion: 0 };
const server = app.listen(0, "127.0.0.1");
after(() => server.close());
afterEach(() => {
  mock.restoreAll();
  mongoose.connection._readyState = 0;
});
async function request(path, method = "GET", body, version = 0) {
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${jwt.sign({ userId: owner, version }, secret, { algorithm: "HS256" })}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function authenticated() {
  mongoose.connection._readyState = 1;
  mock.method(User, "findById", async (id) => {
    assert.equal(id, owner);
    return account;
  });
}
test("profile defaults migrate existing users; updates are validated and owner scoped", async () => {
  authenticated();
  const response = await request("/auth/me");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).preferences.focusMinutes, 25);
  assert.equal(
    (await request("/auth/me", "PATCH", { preferences: { focusMinutes: 17 } })).status,
    400,
  );
  assert.equal((await request("/auth/me", "PATCH", { email: "hijack@example.test" })).status, 400);
  mock.method(User, "findOneAndUpdate", async (filter, update) => {
    assert.deepEqual(filter, { _id: owner });
    assert.deepEqual(update, {
      $set: { name: "Updated", "preferences.appearance": "dark", "preferences.focusMinutes": 45 },
    });
    return { ...account, name: "Updated", preferences: { appearance: "dark", focusMinutes: 45 } };
  });
  const saved = await request("/auth/me", "PATCH", {
    name: "Updated",
    preferences: { appearance: "dark", focusMinutes: 45 },
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).name, "Updated");
});
test("all task reads, status mutations, and deletion include the authenticated owner", async () => {
  authenticated();
  mock.method(Task, "findOne", async (filter) => {
    assert.deepEqual(filter, { _id: other, user: owner });
    return null;
  });
  assert.equal((await request(`/tasks/${other}`)).status, 404);
  assert.equal((await request(`/tasks/${other}`, "PATCH", { status: "pending" })).status, 404);
  mock.method(Task, "findOneAndDelete", async (filter) => {
    assert.deepEqual(filter, { _id: other, user: owner });
    return null;
  });
  assert.equal((await request(`/tasks/${other}`, "DELETE")).status, 404);
});
test("account deletion requires password and confirmation and transactionally removes only own data", async () => {
  authenticated();
  const hash = await bcrypt.hash("QA-password", 4);
  assert.equal((await request("/auth/account", "DELETE", { confirmation: "no" })).status, 400);
  mock.method(User, "findOne", (filter) => ({
    select: async () => ({ ...account, password: hash }),
    session: async () => {
      assert.equal(filter._id, owner);
      assert.equal(filter.password, hash);
      return account;
    },
  }));
  assert.equal(
    (await request("/auth/account", "DELETE", { confirmation: "DELETE", currentPassword: "wrong" }))
      .status,
    400,
  );
  let committed = false,
    ended = false;
  const transaction = {
    withTransaction: async (callback) => {
      await callback();
      committed = true;
    },
    endSession: async () => {
      ended = true;
    },
  };
  mock.method(mongoose, "startSession", async () => transaction);
  mock.method(Task, "deleteMany", async (filter, options) => {
    assert.deepEqual(filter, { user: owner });
    assert.equal(options.session, transaction);
    return { deletedCount: 2 };
  });
  mock.method(User, "deleteOne", async (filter, options) => {
    assert.deepEqual(filter, { _id: owner });
    assert.equal(options.session, transaction);
    return { deletedCount: 1 };
  });
  assert.equal(
    (
      await request("/auth/account", "DELETE", {
        confirmation: "DELETE",
        currentPassword: "QA-password",
      })
    ).status,
    200,
  );
  assert.ok(committed && ended);
});
test("password change increments token version; stale authentication is rejected", async () => {
  authenticated();
  const hash = await bcrypt.hash("QA-password", 4);
  mock.method(User, "findOne", () => ({ select: async () => ({ ...account, password: hash }) }));
  mock.method(User, "findOneAndUpdate", async (filter, update) => {
    assert.deepEqual(filter, { _id: owner, password: hash });
    assert.deepEqual(update.$inc, { tokenVersion: 1 });
    assert.ok(await bcrypt.compare("New-QA-password", update.$set.password));
    return { ...account, tokenVersion: 1 };
  });
  const changed = await request("/auth/password", "PATCH", {
    currentPassword: "QA-password",
    newPassword: "New-QA-password",
    confirmPassword: "New-QA-password",
  });
  assert.equal(changed.status, 200);
  assert.equal(jwt.verify((await changed.json()).token, secret).version, 1);
  mock.restoreAll();
  authenticated();
  assert.equal((await request("/auth/me", "GET", undefined, 4)).status, 401);
});
test("oversize and malformed bodies return concise errors and secure headers", async () => {
  const response = await request("/auth/register", "POST", { name: "x".repeat(34000) });
  assert.equal(response.status, 413);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok(!(await response.text()).includes("stack"));
});
