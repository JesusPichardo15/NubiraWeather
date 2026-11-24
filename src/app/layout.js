import "leaflet/dist/leaflet.css";
import "./globals.css";
import SiteShell from "@/components/SiteShell";
import { themeBootstrap } from "@/lib/theme";

export const metadata = {
  title: { default: "Nubira Weather | Planifica tu evento", template: "%s | Nubira Weather" },
  description: "Evalúa el riesgo climático histórico de tu evento al aire libre antes de elegir una sede o fecha.",
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" } },
};

export default function RootLayout({ children }) {
  return <html lang="es-MX" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body><SiteShell>{children}</SiteShell></body>
  </html>;
}
