import { forward } from "@/lib/backend";

const ACTIONS = new Set([
  "register", "resend-verification", "verify", "login", "logout", "forgot-password", "reset-password", "change-password",
]);

export async function POST(request, { params }) {
  const { action } = await params;
  if (!ACTIONS.has(action)) return new Response(null, { status: 404 });
  return forward(request, `/auth/${action}`, { body: action !== "logout" });
}

export async function GET(request, { params }) {
  if ((await params).action !== "me") return new Response(null, { status: 404 });
  return forward(request, "/auth/me");
}

export async function PATCH(request, { params }) {
  if ((await params).action !== "me") return new Response(null, { status: 404 });
  return forward(request, "/auth/me", { body: true });
}
