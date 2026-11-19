import { forward } from "@/lib/backend";

export function GET(request) {
  return forward(request, "/events");
}

export function POST(request) {
  return forward(request, "/events", { body: true, timeout: 20000 });
}
