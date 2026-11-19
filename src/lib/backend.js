const SESSION = /^nubira_session=[A-Za-z0-9_-]{43}$/;
const BODY_LIMIT = 8 * 1024;
const UNAVAILABLE = "No pudimos conectar con Nubira. Intenta nuevamente.";

function problem(status, detail) {
  return Response.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

export async function forward(request, path, { session = true, body = false, timeout = 12000 } = {}) {
  if (request.method !== "GET") {
    const publicOrigin = new URL(process.env.NUBIRA_PUBLIC_URL || "http://localhost:3000").origin;
    if (request.headers.get("origin") !== publicOrigin) {
      return problem(403, "No se pudo validar el origen de la solicitud.");
    }
  }
  const headers = new Headers({ Accept: "application/json" });
  if (session) {
    const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => SESSION.test(part));
    if (cookie) headers.set("cookie", cookie);
  }
  const token = process.env.NUBIRA_API_TOKEN;
  if (token) headers.set("authorization", `Bearer ${token}`);
  let payload;
  if (body) {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return problem(415, "La solicitud debe estar en formato JSON.");
    }
    try {
      payload = await readBody(request);
      if (payload === null) return problem(413, "La solicitud es demasiado grande.");
      JSON.parse(payload);
    } catch {
      return problem(400, "La solicitud no tiene un formato válido.");
    }
    headers.set("content-type", "application/json");
  }
  try {
    const url = new URL(path, process.env.NUBIRA_API_URL || "http://127.0.0.1:7860");
    const upstream = await fetch(url, {
      method: request.method, headers, body: payload, cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(timeout),
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    if (session) {
      for (const cookie of upstream.headers.getSetCookie()) {
        if (cookie.startsWith("nubira_session=")) responseHeaders.append("set-cookie", cookie);
      }
    }
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter && /^\d+$/.test(retryAfter)) responseHeaders.set("retry-after", retryAfter);
    if (upstream.status === 204) return new Response(null, { status: 204, headers: responseHeaders });
    if (!upstream.headers.get("content-type")?.includes("application/json")) return problem(502, UNAVAILABLE);
    return Response.json(await upstream.json(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return problem(502, UNAVAILABLE);
  }
}
