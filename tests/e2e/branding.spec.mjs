import { expect, test } from "@playwright/test";

async function stubProviders(page) {
  await page.route("**/api/account/me", (route) => route.fulfill({ status: 401, json: { detail: "Sin sesión" } }));
  await page.route("**/api/places", (route) => route.fulfill({ json: { enabled: false, autocomplete: false } }));
  await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
}

test("usa el favicon SVG en todas las secciones y la marca original en escritorio", async ({ page, request }) => {
  await stubProviders(page);
  const favicon = await request.get("/favicon.svg");
  expect(favicon.ok()).toBe(true);
  expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
  const faviconMarkup = await favicon.text();
  expect(faviconMarkup).toContain('fill="#145944"');
  for (const path of ["/", "/eventos", "/cuenta"]) {
    await page.goto(path);
    const icon = page.locator('head link[rel="icon"]');
    await expect(icon).toHaveCount(1);
    await expect(icon).toHaveAttribute("href", "/favicon.svg");
  }
  const brand = page.getByRole("link", { name: "Nubira Weather, inicio" });
  await expect(brand).toHaveText("Nubira Weather");
  await expect(brand.locator("svg")).toBeVisible();
  const cloudPaths = await brand.locator("svg path").evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  expect(cloudPaths).toHaveLength(2);
  for (const path of cloudPaths) expect(faviconMarkup).toContain(`d="${path}"`);
  await expect(brand.locator(".brand-weather")).toBeVisible();
  const footerBrand = page.getByRole("contentinfo").locator(".footer-brand");
  await expect(footerBrand).toHaveText("Nubira Weather");
  await expect(footerBrand.locator("svg")).toBeVisible();
  await expect(page.locator('img[src="/logo.svg"], img[src="/favicon.svg"]')).toHaveCount(0);
  await brand.click();
  await expect(page.getByRole("heading", { name: /Planifica tu evento/ })).toBeVisible();
});

test("la marca y el selector de tema caben en el encabezado móvil", async ({ page }) => {
  await stubProviders(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const brand = page.getByRole("link", { name: "Nubira Weather, inicio" });
    await expect(brand.locator("svg")).toBeVisible();
    await expect(brand.locator(".brand-weather")).toBeHidden();
    await expect(page.getByRole("button", { name: "Modo oscuro" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link")).toHaveCount(3);
    const fits = await page.locator(".head-inner").evaluate((header) => header.scrollWidth <= header.clientWidth);
    expect(fits).toBe(true);
  }
});

test("respeta el tema del sistema y conserva la elección al navegar y recargar", async ({ page }) => {
  await stubProviders(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Modo oscuro" });
  const root = page.locator("html");
  const body = page.locator("body");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(root).toHaveCSS("color-scheme", "dark");
  await expect(body).toHaveCSS("background-color", "rgb(18, 18, 18)");
  await expect(page.locator(".leaflet-control-zoom-in")).toHaveCSS("background-color", "rgb(30, 30, 30)");
  await expect(page.getByRole("button", { name: "Evaluar riesgo" })).toHaveCSS("background-color", "rgb(23, 96, 70)");
  await expect(page.locator(".leaflet-control-attribution")).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Evaluar riesgo" })).toHaveCSS("background-color", "rgb(20, 89, 68)");
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Mis eventos" }).click();
  await expect(page).toHaveURL(/\/eventos$/);
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(body).toHaveCSS("background-color", "rgb(18, 18, 18)");

  await toggle.click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/cuenta");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(root).toHaveCSS("color-scheme", "light");
  await expect(body).toHaveCSS("background-color", "rgb(247, 248, 243)");
  await expect(page.getByLabel("Correo electrónico")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("el tema guardado se aplica antes de cargar JavaScript de Next.js", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("nubira.color-theme", "dark"));
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 18, 18)");
});
