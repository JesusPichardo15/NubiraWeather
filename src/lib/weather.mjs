export const RISKS = [
  { key: "probabilidad_lluvia_pct", icon: "rain", name: "Lluvia", definition: "Al menos 1 mm acumulado en el día." },
  { key: "probabilidad_viento_fuerte_pct", icon: "wind", name: "Viento fuerte", definition: "Viento medio diario de al menos 27 km/h; no mide ráfagas." },
  { key: "probabilidad_temperaturas_adversas_pct", icon: "temperature", name: "Temperatura adversa", definition: "Calor o frío según los umbrales históricos de la zona." },
];

export const RISK_LEVELS = [
  { id: "low", label: "Bajo", minimum: 0, range: "Menos de 30 %" },
  { id: "medium", label: "Medio", minimum: 30, range: "30 a menos de 60 %" },
  { id: "high", label: "Alto", minimum: 60, range: "Desde 60 %" },
];

export function riskLevel(value) {
  if (value >= RISK_LEVELS[2].minimum) return RISK_LEVELS[2];
  if (value >= RISK_LEVELS[1].minimum) return RISK_LEVELS[1];
  return RISK_LEVELS[0];
}

export function dateLabel(value) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function numberLabel(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits }).format(value);
}

export function tomorrow() {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function forecastInput(lat, lon, date) {
  const normalized = String(date);
  if (String(lat).trim() === "" || String(lon).trim() === "") throw new Error("Indica la latitud y la longitud.");
  const latitude = Number(lat), longitude = Number(lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("La latitud debe estar entre −90 y 90, y la longitud entre −180 y 180.");
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== normalized || normalized < tomorrow()) {
    throw new Error("Elige una fecha válida posterior a hoy.");
  }
  const [year, month, day] = normalized.split("-").map(Number);
  return { latitude, longitude, day, month, year };
}

export function validPrediction(data) {
  const date = data?.fecha_objetivo;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Boolean(data && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date &&
    Number.isFinite(data.latitud) && Math.abs(data.latitud) <= 90 &&
    Number.isFinite(data.longitud) && Math.abs(data.longitud) <= 180 &&
    Number.isInteger(data.dias_hacia_el_futuro) && data.dias_hacia_el_futuro > 0 &&
    RISKS.every(({ key }) => Number.isFinite(data[key]) && data[key] >= 0 && data[key] <= 100) &&
    Number.isFinite(data.referencia_umbral_adversa_local_c?.calor_extremo_desde) &&
    Number.isFinite(data.referencia_umbral_adversa_local_c?.frio_extremo_hasta));
}
