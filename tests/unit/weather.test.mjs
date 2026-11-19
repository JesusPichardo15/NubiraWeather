import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { forecastInput, riskLevel, validPrediction } from "../../src/lib/weather.mjs";

const fallback = {
  latitud: 28.1901, longitud: -105.4701, fecha_objetivo: "2027-07-15", dias_hacia_el_futuro: 239,
  probabilidad_lluvia_pct: 69.13, probabilidad_viento_fuerte_pct: 0.19, probabilidad_temperaturas_adversas_pct: 20.4,
  referencia_umbral_adversa_local_c: { calor_extremo_desde: 31.3, frio_extremo_hasta: 3.6 },
};
const sample = await readFile(new URL("../../../output.json", import.meta.url), "utf8").then(JSON.parse).catch((error) => {
  if (error.code === "ENOENT") return fallback;
  throw error;
});

test("interpreta exactamente las probabilidades y los umbrales del contrato", () => {
  assert.equal(validPrediction(sample), true);
  assert.equal(validPrediction({ temp_min: 15, temp_max: 25, precipitacion: 10, vel_viento: 5 }), false);
  assert.equal(validPrediction({ ...sample, probabilidad_lluvia_pct: 101 }), false);
  assert.equal(validPrediction({ ...sample, probabilidad_viento_fuerte_pct: 0 }), true);
  assert.equal(validPrediction({ ...sample, referencia_umbral_adversa_local_c: null }), false);
  assert.deepEqual([29.99, 30, 59.99, 60].map((n) => riskLevel(n).id), ["low", "medium", "medium", "high"]);
});

test("convierte fechas válidas sin defaults y conserva coordenadas cero", () => {
  assert.deepEqual(forecastInput("0", "0", "2080-02-29"),
    { latitude: 0, longitude: 0, day: 29, month: 2, year: 2080 });
  assert.throws(() => forecastInput("", "0", "2080-01-01"), /Indica/);
  assert.throws(() => forecastInput("91", "0", "2080-01-01"), /latitud/);
  assert.throws(() => forecastInput("0", "0", "2080-02-30"), /posterior/);
  assert.throws(() => forecastInput("0", "0", "2020-01-01"), /posterior/);
});
