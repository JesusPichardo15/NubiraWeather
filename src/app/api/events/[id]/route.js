import { forward } from "@/lib/backend";

async function eventRequest(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 });
  return forward(request, `/events/${id}`, { body: request.method === "PATCH" });
}

export { eventRequest as GET, eventRequest as PATCH, eventRequest as DELETE };
