import { expect, test } from "@playwright/test";

const tilePattern = "**/tile.openstreetmap.org/**";

function stubTiles(page) {
  return page.route(tilePattern, (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf1ec"/></svg>',
  }));
}

function visibleTileZooms(page) {
  return page.locator(".leaflet-tile-loaded").evaluateAll((tiles) =>
    [...new Set(tiles.map((tile) => Number(new URL(tile.src).pathname.split("/")[1])))].sort());
}

test("la rueda acerca y aleja el mapa sin capturar el desplazamiento fuera de él", async ({ page }) => {
  await page.setViewportSize({ width: 1370, height: 720 });
  await stubTiles(page);
  await page.goto("/");
  await expect(page.getByText("No es un pronóstico convencional", { exact: true })).toHaveCount(0);
  await expect.poll(() => visibleTileZooms(page)).toEqual([5]);

  await page.getByRole("heading", { name: /Planifica tu evento/ }).hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect.poll(() => visibleTileZooms(page)).toEqual([5]);

  await page.locator(".leaflet-container").hover();
  await page.mouse.wheel(0, -35);
  await expect.poll(() => visibleTileZooms(page)).toEqual([6]);
  await page.mouse.wheel(0, 35);
  await expect.poll(() => visibleTileZooms(page)).toEqual([5]);
  await expect(page.locator(".leaflet-control-zoom-in")).toBeVisible();
  await expect(page.locator(".leaflet-control-zoom-out")).toBeVisible();
});

test("las sugerencias de dirección se eligen con teclado o ratón y sitúan el marcador", async ({ page }) => {
  const addresses = [
    { label: "Avenida Reforma 123, Ciudad de México", lat: 19.4326, lon: -99.1332, zoom: 15 },
    { label: "Avenida Universidad 100, Chihuahua", lat: 28.638, lon: -106.093, zoom: 15 },
  ];
  const queries = [];
  await stubTiles(page);
  await page.route("**/api/places", (route) => route.fulfill({ json: { autocomplete: true, enabled: false } }));
  await page.route("**/api/places/autocomplete", (route) => {
    const query = route.request().postDataJSON().query;
    queries.push(query);
    return route.fulfill({ json: [query.includes("Reforma") ? addresses[0] : addresses[1]] });
  });
  await page.goto("/");
  const address = page.getByRole("combobox", { name: "Dirección de la sede" });
  await address.fill("Av");
  await address.fill("Avenida Reforma");
  await expect(page.getByRole("option", { name: addresses[0].label })).toBeVisible();
  await address.press("ArrowDown");
  await expect(page.getByRole("option", { selected: true })).toHaveText(addresses[0].label);
  await address.press("Enter");
  await expect(address).toHaveValue(addresses[0].label);
  await expect(address).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue("19.432600");
  await expect(page.getByLabel("Longitud", { exact: true })).toHaveValue("-99.133200");
  await expect(page.locator('.venue-pin[title="Ubicación seleccionada"]')).toBeVisible();
  await expect.poll(() => visibleTileZooms(page)).toEqual([15]);

  await address.fill("Avenida Universidad");
  await page.getByRole("option", { name: addresses[1].label }).click();
  await expect(address).toHaveValue(addresses[1].label);
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue("28.638000");
  await expect(page.getByLabel("Longitud", { exact: true })).toHaveValue("-106.093000");
  await expect.poll(() => page.locator(".leaflet-container").evaluate((container) => {
    const marker = container.querySelector(".venue-pin").getBoundingClientRect();
    const map = container.getBoundingClientRect();
    return Math.hypot(marker.x + marker.width / 2 - (map.x + map.width / 2),
      marker.bottom - (map.y + map.height / 2));
  })).toBeLessThan(5);
  expect(queries).toEqual(["Avenida Reforma", "Avenida Universidad"]);
});

test("los clics conservan las coordenadas y solo muestran la dirección del último punto", async ({ page }) => {
  await stubTiles(page);
  await page.route("**/api/places", (route) => route.fulfill({ json: { autocomplete: true, enabled: false } }));
  let releaseFirst;
  const firstResponse = new Promise((resolve) => { releaseFirst = resolve; });
  const reverseCalls = [];
  const autocompleteCalls = [];
  await page.route("**/api/places/autocomplete", (route) => {
    autocompleteCalls.push(route.request().postDataJSON());
    return route.fulfill({ json: [] });
  });
  await page.route("**/api/places/reverse", async (route) => {
    reverseCalls.push(route.request().postDataJSON());
    if (reverseCalls.length === 1) {
      await firstResponse;
      await route.fulfill({ json: { label: "Dirección anterior" } }).catch(() => {});
    } else if (reverseCalls.length === 2) {
      await route.fulfill({ json: { label: "Dirección cercana al último punto" } });
    } else {
      await route.fulfill({ json: { label: null } });
    }
  });

  try {
    await page.goto("/");
    const address = page.getByRole("combobox", { name: "Dirección de la sede" });
    const map = page.locator(".leaflet-container");
    const lat = page.getByLabel("Latitud", { exact: true });
    const lon = page.getByLabel("Longitud", { exact: true });
    await expect(address).toBeVisible();
    await expect(page.getByText(/Elige una sugerencia o ajusta el punto en el mapa/)).toHaveCount(0);
    await expect(map.getByRole("link", { name: "Geoapify", exact: true })).toBeVisible();

    await map.click({ position: { x: 250, y: 110 } });
    await expect.poll(() => reverseCalls.length).toBe(1);
    await expect(map.locator(".venue-pin")).toBeVisible();
    await expect(lat).toHaveValue(reverseCalls[0].lat.toFixed(6));
    await expect(lon).toHaveValue(reverseCalls[0].lon.toFixed(6));
    await expect(address).toHaveAttribute("placeholder", "Buscando dirección…");

    await map.click({ position: { x: 360, y: 180 } });
    await expect(address).toHaveValue("Dirección cercana al último punto");
    releaseFirst();
    await expect(lat).toHaveValue(reverseCalls[1].lat.toFixed(6));
    await expect(lon).toHaveValue(reverseCalls[1].lon.toFixed(6));
    await expect(address).toHaveValue("Dirección cercana al último punto");
    await expect(address).toHaveAttribute("aria-expanded", "false");

    await map.click({ position: { x: 380, y: 220 } });
    await expect(address).toHaveAttribute("placeholder", "Dirección no disponible");
    await expect(address).toHaveValue("");
    await expect(lat).toHaveValue(reverseCalls[2].lat.toFixed(6));
    await expect(lon).toHaveValue(reverseCalls[2].lon.toFixed(6));
    await expect(map.locator(".venue-pin")).toBeVisible();
    expect(autocompleteCalls).toEqual([]);
  } finally {
    releaseFirst();
  }
});

test("cada nivel del semáforo muestra una etiqueta y un color distintos", async ({ page }) => {
  await stubTiles(page);
  await page.route("**/api/weather", (route) => {
    const { latitude, longitude, day, month, year } = route.request().postDataJSON();
    return route.fulfill({ json: {
      latitud: latitude, longitud: longitude, fecha_objetivo: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      dias_hacia_el_futuro: 30, probabilidad_lluvia_pct: 65,
      probabilidad_viento_fuerte_pct: 45, probabilidad_temperaturas_adversas_pct: 12,
      referencia_umbral_adversa_local_c: { calor_extremo_desde: 31.3, frio_extremo_hasta: 3.6 },
    } });
  });
  await page.goto("/");
  await page.getByLabel("Latitud", { exact: true }).fill("28.1901");
  await page.getByLabel("Longitud", { exact: true }).fill("-105.4701");
  const inAMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Fecha del evento").fill(inAMonth);
  await page.getByRole("button", { name: "Evaluar riesgo" }).click();
  const legend = page.getByRole("list", { name: "Semáforo de riesgo" });
  await expect(legend.getByRole("listitem")).toHaveText(["Bajo Menos de 30 %", "Medio 30 a menos de 60 %", "Alto Desde 60 %"]);
  const levels = [
    ["Lluvia", "Riesgo alto", "rgb(232, 77, 89)"],
    ["Viento fuerte", "Riesgo medio", "rgb(229, 173, 24)"],
    ["Temperatura adversa", "Riesgo bajo", "rgb(44, 158, 87)"],
  ];
  for (const [heading, label, color] of levels) {
    const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
    await expect(card.getByText(label)).toBeVisible();
    await expect(card).toHaveCSS("border-top-color", color);
  }
});
