import { forecastInput, RISKS, validPrediction } from "./weather.mjs";

const DRAFT_KEY = "nubira.evaluation-draft.v2";
const HANDOFF_KEY = "nubira.evaluation-handoff.v1";
const HANDOFF_ID_KEY = "nubira.evaluation-handoff-id.v1";
const LEGACY_KEY = "nubira.evaluation-draft.v1";
export const HANDOFF_TTL = 24 * 60 * 60 * 1000;
export const RESUME_ACCOUNT = "/cuenta?continuar=1";
export const EMPTY_ADDRESS = { text: "", phase: "idle" };
export const EMPTY_DRAFT = {
  coords: { lat: "", lon: "" }, address: EMPTY_ADDRESS, date: "", focus: null, result: null,
};

const ADDRESS_PHASES = new Set(["idle", "typing", "selected", "resolved", "unavailable"]);
const boundedText = (value, maxLength) => typeof value === "string" ? value.slice(0, maxLength) : "";
const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

function resultFor(data, { coords, date }) {
  if (!validPrediction(data) || data.fecha_objetivo !== date) return null;
  let input;
  try {
    input = forecastInput(coords.lat, coords.lon, date);
  } catch {
    return null;
  }
  if (data.latitud !== input.latitude || data.longitud !== input.longitude) return null;
  const { calor_extremo_desde, frio_extremo_hasta } = data.referencia_umbral_adversa_local_c;
  return { input, data: {
    latitud: data.latitud, longitud: data.longitud, fecha_objetivo: date,
    dias_hacia_el_futuro: data.dias_hacia_el_futuro,
    ...Object.fromEntries(RISKS.map(({ key }) => [key, data[key]])),
    referencia_umbral_adversa_local_c: { calor_extremo_desde, frio_extremo_hasta },
  } };
}

export function normalizeDraft(value) {
  const coords = { lat: boundedText(value?.coords?.lat, 40), lon: boundedText(value?.coords?.lon, 40) };
  const date = typeof value?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value.date : "";
  const text = boundedText(value?.address?.text, 300);
  const phase = ADDRESS_PHASES.has(value?.address?.phase) ? value.address.phase : text ? "typing" : "idle";
  const focus = value?.focus;
  return {
    coords, date, address: { text, phase },
    focus: inRange(focus?.lat, -90, 90) && inRange(focus?.lon, -180, 180) ? {
      lat: focus.lat, lon: focus.lon,
      ...(Number.isInteger(focus.zoom) && inRange(focus.zoom, 0, 19) ? { zoom: focus.zoom } : {}),
    } : null,
    result: resultFor(value?.result?.data, { coords, date }),
  };
}

function json(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function get(scope, key) {
  try { return window[scope].getItem(key); } catch { return null; }
}

function set(scope, key, value) {
  try { window[scope].setItem(key, value); return true; } catch { return false; }
}

function remove(scope, key) {
  try { window[scope].removeItem(key); } catch {}
}

export function loadTabDraft() {
  const draft = json(get("sessionStorage", DRAFT_KEY));
  if (draft) return normalizeDraft(draft);
  const legacy = json(get("sessionStorage", LEGACY_KEY));
  if (!validPrediction(legacy?.data)) return null;
  const { latitud, longitud, fecha_objetivo } = legacy.data;
  return normalizeDraft({
    coords: { lat: String(latitud), lon: String(longitud) }, date: fecha_objetivo,
    result: legacy, focus: { lat: latitud, lon: longitud },
  });
}

export function saveTabDraft(draft) {
  if (set("sessionStorage", DRAFT_KEY, JSON.stringify(normalizeDraft(draft)))) {
    remove("sessionStorage", LEGACY_KEY);
  }
}

export function clearTabDraft() {
  remove("sessionStorage", DRAFT_KEY);
  remove("sessionStorage", LEGACY_KEY);
}

export function readTabHandoffId() {
  return get("sessionStorage", HANDOFF_ID_KEY);
}

export function saveTabHandoffId(id) {
  if (id) set("sessionStorage", HANDOFF_ID_KEY, id);
  else remove("sessionStorage", HANDOFF_ID_KEY);
}

export function decodeHandoff(raw, now = Date.now()) {
  const saved = json(raw);
  if (typeof saved?.id !== "string" || !saved.id || !Number.isFinite(saved.createdAt) ||
      saved.createdAt > now || now - saved.createdAt >= HANDOFF_TTL) return null;
  const draft = normalizeDraft(saved.draft);
  return draft.result ? { id: saved.id, draft } : null;
}

export function saveHandoff(id, draft) {
  const sanitized = normalizeDraft(draft);
  if (sanitized.result) set("localStorage", HANDOFF_KEY, JSON.stringify({ id, createdAt: Date.now(), draft: sanitized }));
}

export function loadHandoff() {
  const raw = get("localStorage", HANDOFF_KEY);
  const handoff = decodeHandoff(raw);
  if (raw && !handoff && get("localStorage", HANDOFF_KEY) === raw) remove("localStorage", HANDOFF_KEY);
  return handoff;
}

export function clearHandoff(id) {
  if (!id || loadHandoff()?.id === id) remove("localStorage", HANDOFF_KEY);
}
