import { forward } from "@/lib/backend";

export function POST(request) {
  return forward(request, "/places/autocomplete", { session: false, body: true, timeout: 6500 });
}
