import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeHandoff, HANDOFF_TTL, normalizeDraft } from "../../src/lib/draft.mjs";
import { tomorrow } from "../../src/lib/weather.mjs";

const evaluation = () => {
  const date = tomorrow();
  return {
    date,
    coords: { lat: "0.000000", lon: "-105.470100" },
    address: { text: "Sede de prueba", phase: "selected" },
    focus: { lat: 0, lon: -105.4701, zoom: 15 },
    result: { input: { latitude: 89 }, data: {
      latitud: 0, longitud: -105.4701, fecha_objetivo: date, dias_hacia_el_futuro: 1,
      probabilidad_lluvia_pct: 30, probabilidad_viento_fuerte_pct: 40, probabilidad_temperaturas_adversas_pct: 50,
      referencia_umbral_adversa_local_c: { calor_extremo_desde: 31.3, frio_extremo_hasta: 3.6 },
    } },
  };
};

test("el borrador conserva campos parciales y una ubicación seleccionada en coordenadas cero", () => {
  const draft = evaluation();
  const complete = normalizeDraft(draft);
  assert.deepEqual(complete.address, draft.address);
  assert.deepEqual(complete.coords, draft.coords);
  assert.deepEqual(complete.focus, draft.focus);
  assert.deepEqual(complete.result.data, draft.result.data);
  assert.equal(complete.result.input.latitude, 0);

  const partial = normalizeDraft({
    date: draft.date, coords: { lat: "-10", lon: "" },
    address: { text: "Avenida sin terminar", phase: "typing" },
  });
  assert.deepEqual(partial.coords, { lat: "-10", lon: "" });
  assert.equal(partial.address.text, "Avenida sin terminar");
  assert.equal(partial.date, draft.date);
  assert.equal(partial.result, null);
});

test("ignora resultados que no corresponden al formulario o ya vencieron", () => {
  const draft = evaluation();
  assert.equal(normalizeDraft({ ...draft, coords: { lat: "1", lon: draft.coords.lon } }).result, null);
  const elapsed = {
    ...draft, date: "2000-01-01",
    result: { data: { ...draft.result.data, fecha_objetivo: "2000-01-01" } },
  };
  const restored = normalizeDraft(elapsed);
  assert.equal(restored.result, null);
  assert.equal(restored.date, "2000-01-01");
  assert.deepEqual(restored.address, draft.address);
});

test("solo acepta una continuación vigente que contenga una evaluación válida", () => {
  const createdAt = 1_000_000;
  const id = "draft-test";
  const draft = evaluation();
  const raw = JSON.stringify({ id, createdAt, draft });
  assert.equal(decodeHandoff(raw, createdAt)?.id, id);
  assert.equal(decodeHandoff(raw, createdAt + HANDOFF_TTL), null);
  assert.equal(decodeHandoff(raw, createdAt - 1), null);
  assert.equal(decodeHandoff(JSON.stringify({ id, createdAt, draft: { ...draft, result: null } }), createdAt), null);
  assert.equal(decodeHandoff("{corrupto", createdAt), null);
});
