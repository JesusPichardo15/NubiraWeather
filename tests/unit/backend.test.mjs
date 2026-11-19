import assert from "node:assert/strict";
import { test } from "node:test";
import { forward } from "../../src/lib/backend.js";

const own = new URL(process.env.NUBIRA_PUBLIC_URL || "http://localhost:3000").origin;

function makeRequest(origin, body = '{"day":15}') {
  return new Request(`${own}/api/weather?unused=1`, {
    method: "POST", body, headers: {
      origin, "content-type": "application/json", authorization: "Bearer browser",
      cookie: `other_cookie=secret;nubira_session=${"a".repeat(43)}`,
    },
  });
}

test("el proxy de consulta utiliza solo el destino fijo y no reenvía la sesión", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.pathname, "/clima");
    assert.equal(url.search, "");
    assert.equal(options.headers.get("cookie"), null);
    assert.notEqual(options.headers.get("authorization"), "Bearer browser");
    assert.equal(options.redirect, "error");
    assert.equal(options.body, '{"day":15}');
    return Response.json({ ok: true });
  });
  const response = await forward(makeRequest(own), "/clima", { body: true, session: false });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rechaza orígenes ajenos y cuerpos grandes antes de contactar con FastAPI", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", () => { throw new Error("No esperado"); });
  const options = { body: true };
  assert.equal((await forward(makeRequest("https://otro.example"), "/auth/login", options)).status, 403);
  assert.equal((await forward(makeRequest(own, `"${"x".repeat(8192)}"`), "/auth/login", options)).status, 413);
  assert.equal((await forward(makeRequest(own, "{"), "/auth/login", options)).status, 400);
  assert.equal(upstream.mock.callCount(), 0);
});

test("solo propaga la cookie propia y nunca simula una respuesta si la API está caída", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers.get("cookie"), `nubira_session=${"a".repeat(43)}`);
    throw new TypeError("offline");
  });
  const response = await forward(makeRequest(own), "/auth/login", { body: true });
  assert.equal(response.status, 502);
  assert.deepEqual(Object.keys(await response.json()), ["detail"]);
});
