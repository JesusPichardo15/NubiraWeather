import { forward } from "@/lib/backend";

export function GET(request) {
  return forward(request, "/places", { session: false });
}

export function POST(request) {
  return forward(request, "/places", { session: false, body: true, timeout: 8000 });
}
