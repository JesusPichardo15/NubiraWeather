import { forward } from "@/lib/backend";

export function POST(request) {
  return forward(request, "/places/reverse", { session: false, body: true, timeout: 6500 });
}
