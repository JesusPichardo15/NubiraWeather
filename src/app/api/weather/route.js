import { forward } from "@/lib/backend";

export function POST(request) {
  return forward(request, "/clima", { body: true, session: false, timeout: 20000 });
}
