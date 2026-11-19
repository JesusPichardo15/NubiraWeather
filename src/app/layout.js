import "leaflet/dist/leaflet.css";
import "./globals.css";
import SiteShell from "@/components/SiteShell";

export const metadata = {
  title: { default: "Nubira Weather | Planifica tu evento", template: "%s | Nubira Weather" },
  description: "Evalúa el riesgo climático histórico de tu evento al aire libre antes de elegir una sede o fecha.",
};

export default function RootLayout({ children }) {
  return <html lang="es-MX"><body><SiteShell>{children}</SiteShell></body></html>;
}
