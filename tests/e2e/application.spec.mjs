import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const mailDir = process.env.NUBIRA_E2E_MAIL_DIR;
const password = "Una cuenta de prueba segura 2027";

function targetDate() {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 90);
  return future.toISOString().slice(0, 10);
}

async function evaluate(page, venue) {
  await page.goto("/");
  if (venue) {
    await page.getByRole("combobox", { name: "Dirección de la sede" }).fill("Sede de prueba");
    await page.getByRole("option", { name: venue.label }).click();
  } else {
    await page.getByLabel("Latitud", { exact: true }).fill("28.1901");
    await page.getByLabel("Longitud", { exact: true }).fill("-105.4701");
  }
  await page.getByLabel("Fecha del evento").fill(targetDate());
  const pending = page.waitForResponse((r) => r.url().endsWith("/api/weather") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Evaluar riesgo" }).click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

async function verificationLink(email) {
  for (const item of await readdir(mailDir).catch(() => [])) {
    if (!item.endsWith(".eml")) continue;
    const message = await readFile(join(mailDir, item), "utf8");
    if (!message.includes(`To: ${email}`)) continue;
    const contents = message.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
    const match = contents.match(/https?:\/\/[^\s]+\/cuenta\/verificar#token=[A-Za-z0-9_-]{43}/);
    if (match) return match[0];
  }
  return "";
}

test("consulta real, verifica en una pestaña nueva, retoma la evaluación y administra el evento", async ({ page: original, context }) => {
  test.skip(!mailDir, "Configura la bandeja local para verificar la entrega.");
  const venue = { label: "Sede de prueba, Chihuahua", lat: 28.1901, lon: -105.4701, zoom: 15 };
  await context.route("**/tile.openstreetmap.org/**", (route) => route.abort());
  await context.route("**/api/places", (route) => route.fulfill({ json: { autocomplete: true, enabled: false } }));
  await context.route("**/api/places/autocomplete", (route) => route.fulfill({ json: [venue] }));
  const prediction = await evaluate(original, venue);
  const formattedRain = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(prediction.probabilidad_lluvia_pct);
  await expect(original.getByRole("heading", { name: "Riesgos para tu evento" })).toBeVisible();
  await expect(original.getByRole("article").filter({ has: original.getByRole("heading", { name: "Lluvia", exact: true }) })
    .locator(".risk-number")).toHaveText(`${formattedRain}%`);
  await original.getByRole("link", { name: "Ingresar para guardar" }).click();
  await original.getByRole("button", { name: "Registrarme" }).click();
  await original.getByLabel("Nombre", { exact: true }).fill("Organizadora de prueba");
  const email = `browser-${Date.now()}@example.com`;
  await original.getByLabel("Correo electrónico").fill(email);
  await original.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(original.getByText("Revisa tu bandeja de entrada")).toBeVisible();
  await expect.poll(() => verificationLink(email)).toContain("/cuenta/verificar");
  const page = await context.newPage();
  let repeatedEvaluations = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/weather")) repeatedEvaluations++;
  });
  await page.goto(await verificationLink(email));
  await page.getByLabel("Elige tu contraseña").fill(password);
  await page.getByLabel("Confirma la contraseña").fill(password);
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  await expect(page.getByText("Correo verificado. Ya puedes iniciar sesión.")).toBeVisible();
  await page.getByRole("link", { name: "Iniciar sesión y retomar consulta" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Riesgos para tu evento" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Dirección de la sede" })).toHaveValue(venue.label);
  await expect(page.getByLabel("Fecha del evento")).toHaveValue(prediction.fecha_objetivo);
  await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Lluvia", exact: true }) })
    .locator(".risk-number")).toHaveText(`${formattedRain}%`);
  expect(repeatedEvaluations).toBe(0);
  const unrelated = await context.newPage();
  await unrelated.goto("/");
  await expect(unrelated.getByRole("combobox", { name: "Dirección de la sede" })).toHaveValue("");
  await expect(unrelated.getByRole("region", { name: "Resultados de la consulta" })).toHaveCount(0);
  await unrelated.close();
  await page.getByRole("button", { name: "Guardar evento" }).click();
  await page.getByLabel("Nombre de tu evento").fill("Festival de prueba");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Festival de prueba" })).toBeVisible();
  await expect(page.getByText("Evento guardado.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Festival de prueba" })).toBeVisible();
  await page.getByRole("button", { name: "Renombrar" }).click();
  await page.getByLabel("Nombre del evento").fill("Festival renombrado");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByRole("heading", { name: "Festival renombrado" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Alertas por correo" }).check();
  await expect(page.getByText("Alertas activadas.")).toBeVisible();
  await page.getByRole("button", { name: "Eliminar evento" }).click();
  await page.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(page.getByRole("heading", { name: "Aún no tienes eventos" })).toBeVisible();
  await page.getByRole("link", { name: "Mi cuenta" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/eventos");
  await expect(page.getByRole("heading", { name: "Tu historial es privado" })).toBeVisible();
});

test("funciona en móvil aunque no se carguen las teselas del mapa", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
  await evaluate(page);
  await expect(page.getByText(/Hay teselas no disponibles/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Riesgos para tu evento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Temperatura adversa" })).toBeVisible();
  const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflowing).toBe(false);
});
