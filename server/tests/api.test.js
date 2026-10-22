/**
 * API tests for auth and task CRUD. Runs with `npm test`; no database needed
 * (see fakeModels.js). Each test starts from an empty store.
 */
process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGIN = "https://nextask.example";

const { makeFakeModel } = require("./fakeModels");

jest.mock("../models/User", () => {
  const { makeFakeModel: make } = require("./fakeModels");
  return make(jest.requireActual("../models/User"));
});
jest.mock("../models/Task", () => {
  const { makeFakeModel: make } = require("./fakeModels");
  return make(jest.requireActual("../models/Task"));
});

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
const Task = require("../models/Task");

beforeEach(() => {
  User._reset();
  Task._reset();
});

async function register(overrides = {}) {
  const body = { username: "asha", email: "asha@example.com", password: "secret123", ...overrides };
  const res = await request(app).post("/api/auth/register").send(body);
  return res;
}

async function tokenFor(email = "asha@example.com") {
  const res = await register({ email, username: email.split("@")[0] });
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------- //
describe("auth", () => {
  test("register returns a token and never the password", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.password).toBeUndefined();
    expect(User._all()[0].password).not.toBe("secret123"); // stored hashed
  });

  test("register validates input", async () => {
    expect((await register({ password: "" })).status).toBe(400);
    expect((await register({ email: "not-an-email" })).status).toBe(400);
    expect((await register({ password: "123" })).status).toBe(400);
  });

  test("duplicate email is rejected, case-insensitively", async () => {
    await register();
    const res = await register({ email: "ASHA@Example.com" });
    expect(res.status).toBe(409);
  });

  test("login works and is case-insensitive on email", async () => {
    await register();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "Asha@Example.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, "test-secret").id).toBeTruthy();
  });

  test("wrong password and unknown email give the same answer", async () => {
    await register();
    const wrongPw = await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "nope123" });
    const noUser = await request(app).post("/api/auth/login").send({ email: "ghost@example.com", password: "nope123" });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.message).toBe(noUser.body.message);
  });

  test("missing body does not crash the server", async () => {
    const res = await request(app).post("/api/auth/login");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------- //
describe("task routes require a valid token", () => {
  test.each([
    ["no header", {}],
    ["wrong scheme", { Authorization: "Token abc" }],
    ["garbage token", { Authorization: "Bearer abc.def.ghi" }],
    ["token signed with another secret", { Authorization: `Bearer ${jwt.sign({ id: "x" }, "other")}` }],
  ])("%s -> 401", async (_name, headers) => {
    const res = await request(app).get("/api/tasks").set(headers);
    expect(res.status).toBe(401);
  });

  test("the auth middleware never logs the token or the secret", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const token = await tokenFor();
    await request(app).get("/api/tasks").set(auth(token));
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).not.toContain("test-secret");
    expect(logged).not.toContain(token);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------- //
describe("task CRUD", () => {
  test("create, list, get, update, delete", async () => {
    const token = await tokenFor();

    const created = await request(app).post("/api/tasks").set(auth(token))
      .send({ title: "Write README", description: "for NexTask", dueDate: "2026-11-01" });
    expect(created.status).toBe(201);
    const id = created.body._id;

    const list = await request(app).get("/api/tasks").set(auth(token));
    expect(list.body).toHaveLength(1);

    const one = await request(app).get(`/api/tasks/${id}`).set(auth(token));
    expect(one.body.title).toBe("Write README");

    const updated = await request(app).put(`/api/tasks/${id}`).set(auth(token)).send({ completed: true });
    expect(updated.status).toBe(200);
    expect(updated.body.completed).toBe(true);
    expect(updated.body.title).toBe("Write README"); // untouched fields kept

    const del = await request(app).delete(`/api/tasks/${id}`).set(auth(token));
    expect(del.status).toBe(200);
    expect((await request(app).get("/api/tasks").set(auth(token))).body).toHaveLength(0);
  });

  test("due date is saved (regression: schema had no dueDate field)", async () => {
    const token = await tokenFor();
    const res = await request(app).post("/api/tasks").set(auth(token)).send({ title: "Pay rent", dueDate: "2026-11-05" });
    expect(res.body.dueDate).toMatch(/^2026-11-05/);

    const cleared = await request(app).put(`/api/tasks/${res.body._id}`).set(auth(token)).send({ dueDate: "" });
    expect(cleared.body.dueDate).toBeNull();
  });

  test("title is required and cannot be blanked", async () => {
    const token = await tokenFor();
    expect((await request(app).post("/api/tasks").set(auth(token)).send({ title: "   " })).status).toBe(400);
    const t = await request(app).post("/api/tasks").set(auth(token)).send({ title: "ok" });
    expect((await request(app).put(`/api/tasks/${t.body._id}`).set(auth(token)).send({ title: "" })).status).toBe(400);
  });

  test("invalid due date gives 400, not 500", async () => {
    const token = await tokenFor();
    const res = await request(app).post("/api/tasks").set(auth(token)).send({ title: "x", dueDate: "not-a-date" });
    expect(res.status).toBe(400);
  });

  test("malformed task id gives 404, not 500", async () => {
    const token = await tokenFor();
    const res = await request(app).get("/api/tasks/not-an-id").set(auth(token));
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------- //
describe("users cannot touch each other's tasks", () => {
  async function twoUsersAndATask() {
    const asha = await tokenFor("asha@example.com");
    const ravi = await tokenFor("ravi@example.com");
    const task = await request(app).post("/api/tasks").set(auth(asha)).send({ title: "Asha's task" });
    return { asha, ravi, id: task.body._id };
  }

  test("another user's task is invisible: get, update, delete all 404", async () => {
    const { ravi, id } = await twoUsersAndATask();
    expect((await request(app).get(`/api/tasks/${id}`).set(auth(ravi))).status).toBe(404);
    expect((await request(app).put(`/api/tasks/${id}`).set(auth(ravi)).send({ title: "hacked" })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${id}`).set(auth(ravi))).status).toBe(404);
    expect((await request(app).get("/api/tasks").set(auth(ravi))).body).toHaveLength(0);
  });

  test("owner cannot reassign a task by sending a `user` field (regression)", async () => {
    const { asha, ravi, id } = await twoUsersAndATask();
    const raviId = jwt.verify(ravi, "test-secret").id;
    await request(app).put(`/api/tasks/${id}`).set(auth(asha)).send({ title: "moved?", user: raviId });
    expect((await request(app).get("/api/tasks").set(auth(ravi))).body).toHaveLength(0);
    expect((await request(app).get("/api/tasks").set(auth(asha))).body[0].title).toBe("moved?");
  });

  test("create ignores a `user` field in the body", async () => {
    const { ravi } = await twoUsersAndATask();
    const asha = await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "secret123" });
    const ashaId = jwt.verify(asha.body.token, "test-secret").id;
    await request(app).post("/api/tasks").set(auth(ravi)).send({ title: "planted", user: ashaId });
    const ashaTasks = await request(app).get("/api/tasks").set(auth(asha.body.token));
    expect(ashaTasks.body.map((t) => t.title)).not.toContain("planted");
  });
});

// ---------------------------------------------------------------------- //
describe("app", () => {
  test("health check", async () => {
    expect((await request(app).get("/api/health")).body).toEqual({ status: "ok" });
  });

  test("CORS allows the configured frontend only", async () => {
    const ok = await request(app).get("/api/health").set("Origin", "https://nextask.example");
    const bad = await request(app).get("/api/health").set("Origin", "https://evil.example");
    expect(ok.headers["access-control-allow-origin"]).toBe("https://nextask.example");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("invalid JSON gives 400", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
  });

  test("the old /test-db route that listed collections is gone", async () => {
    expect((await request(app).get("/test-db")).status).toBe(404);
  });
});

// keep the import used (linters)
void makeFakeModel;
