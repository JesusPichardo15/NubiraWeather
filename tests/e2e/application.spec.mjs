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

async function evaluate(page) {
  await page.goto("/");
  await page.getByLabel("Latitud", { exact: true }).fill("28.1901");
  await page.getByLabel("Longitud", { exact: true }).fill("-105.4701");
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

test("consulta real, confirma la cuenta, retoma la evaluación, guarda, renombra y elimina un evento", async ({ page }) => {
  test.skip(!mailDir, "Configura la bandeja local para verificar la entrega.");
  const prediction = await evaluate(page);
  const formattedRain = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(prediction.probabilidad_lluvia_pct);
  await expect(page.getByRole("heading", { name: "Riesgos para tu evento" })).toBeVisible();
  await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Lluvia", exact: true }) })
    .locator(".risk-number")).toHaveText(`${formattedRain}%`);
  await page.getByRole("link", { name: "Ingresar para guardar" }).click();
  await page.getByRole("button", { name: "Registrarme" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Organizadora de prueba");
  const email = `browser-${Date.now()}@example.com`;
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Revisa tu bandeja de entrada")).toBeVisible();
  await expect.poll(() => verificationLink(email)).toContain("/cuenta/verificar");
  await page.goto(await verificationLink(email));
  await page.getByLabel("Elige tu contraseña").fill(password);
  await page.getByLabel("Confirma la contraseña").fill(password);
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  await expect(page.getByText("Correo verificado. Ya puedes iniciar sesión.")).toBeVisible();
  await page.getByRole("link", { name: "Ir a mi cuenta" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Riesgos para tu evento" })).toBeVisible();
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
