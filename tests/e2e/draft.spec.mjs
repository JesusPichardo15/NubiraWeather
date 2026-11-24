import { expect, test } from "@playwright/test";

const venue = { label: "Avenida Universidad 100, Chihuahua", lat: 28.638, lon: -106.093, zoom: 15 };
const user = { name: "Organizadora", email: "organiza@example.com", verified: true };

function eventDate() {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
}

async function stubEndpoints(page, { signedIn, manual = false }) {
  await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
  await page.route("**/api/account/me", (route) => signedIn ? route.fulfill({ json: user }) :
    route.fulfill({ status: 401, json: { detail: "Inicia sesión para continuar." } }));
  await page.route("**/api/events", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/places", (route) => route.fulfill({ json: { autocomplete: !manual, enabled: manual } }));
  await page.route("**/api/places/autocomplete", (route) => route.fulfill({ json: [venue] }));
}

async function selectVenue(page) {
  await page.getByRole("combobox", { name: "Dirección de la sede" }).fill("Avenida Universidad");
  await page.getByRole("option", { name: venue.label }).click();
}

function stubEvaluation(page, calls) {
  return page.route("**/api/weather", (route) => {
    const { latitude, longitude, year, month, day } = route.request().postDataJSON();
    calls.push({ latitude, longitude });
    const fecha = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return route.fulfill({ json: {
      latitud: latitude, longitud: longitude, fecha_objetivo: fecha, dias_hacia_el_futuro: 30,
      probabilidad_lluvia_pct: 65, probabilidad_viento_fuerte_pct: 45, probabilidad_temperaturas_adversas_pct: 12,
      referencia_umbral_adversa_local_c: { calor_extremo_desde: 31.3, frio_extremo_hasta: 3.6 },
    } });
  });
}

test("conserva datos parciales y luego el resultado al navegar o recargar", async ({ page }) => {
  const calls = [];
  const date = eventDate();
  await stubEndpoints(page, { signedIn: true });
  await stubEvaluation(page, calls);
  await page.goto("/");
  const address = page.getByRole("combobox", { name: "Dirección de la sede" });
  await address.fill("Avenida sin terminar");
  await page.getByLabel("Latitud", { exact: true }).fill("28.1");
  await page.getByLabel("Fecha del evento").fill(date);

  await page.getByRole("link", { name: "Mis eventos" }).click();
  await expect(page.getByRole("heading", { name: "Mis eventos" })).toBeVisible();
  await page.getByRole("link", { name: "Mi cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tu perfil" })).toBeVisible();
  await page.getByRole("link", { name: "Explorar", exact: true }).click();
  await expect(address).toHaveValue("Avenida sin terminar");
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue("28.1");
  await expect(page.getByLabel("Longitud", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Fecha del evento")).toHaveValue(date);
  await expect(page.getByRole("region", { name: "Resultados de la consulta" })).toHaveCount(0);
  expect(calls).toHaveLength(0);

  await selectVenue(page);
  await page.getByRole("button", { name: "Evaluar riesgo" }).click();
  const result = page.getByRole("region", { name: "Resultados de la consulta" });
  await expect(result).toBeVisible();
  await page.getByRole("link", { name: "Mis eventos" }).click();
  await expect(page.getByRole("heading", { name: "Mis eventos" })).toBeVisible();
  await page.getByRole("link", { name: "Explorar", exact: true }).click();
  await expect(result).toBeVisible();
  await page.reload();
  await expect(address).toHaveValue(venue.label);
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue("28.638000");
  await expect(page.getByLabel("Longitud", { exact: true })).toHaveValue("-106.093000");
  await expect(page.getByLabel("Fecha del evento")).toHaveValue(date);
  await expect(page.locator('.venue-pin[title="Ubicación seleccionada"]')).toBeVisible();
  await expect(result).toBeVisible();
  expect(calls).toHaveLength(1);
});

test("iniciar sesión desde la consulta conserva la dirección y no vuelve a evaluar", async ({ page }) => {
  const calls = [];
  await stubEndpoints(page, { signedIn: false });
  await stubEvaluation(page, calls);
  await page.route("**/api/account/login", (route) => route.fulfill({ json: user }));
  await page.goto("/");
  await selectVenue(page);
  await page.getByLabel("Fecha del evento").fill(eventDate());
  await page.getByRole("button", { name: "Evaluar riesgo" }).click();
  await page.getByRole("link", { name: "Ingresar para guardar" }).click();
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Una contraseña de prueba");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByRole("combobox", { name: "Dirección de la sede" })).toHaveValue(venue.label);
  await expect(page.getByRole("region", { name: "Resultados de la consulta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar evento" })).toBeVisible();
  expect(calls).toHaveLength(1);
});

test("conserva la búsqueda manual cuando no está habilitado el autocompletado", async ({ page }) => {
  await stubEndpoints(page, { signedIn: false, manual: true });
  await page.goto("/");
  await page.getByText("Buscar una ciudad o lugar").click();
  await page.getByLabel("Nombre del lugar").fill("Delicias, Chihuahua");
  await page.getByRole("link", { name: "Mis eventos" }).click();
  await page.getByRole("link", { name: "Explorar", exact: true }).click();
  await expect(page.getByLabel("Nombre del lugar")).toHaveValue("Delicias, Chihuahua");
  await expect(page.getByLabel("Nombre del lugar")).toBeVisible();
});
