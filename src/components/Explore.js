"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { EMPTY_ADDRESS, RESUME_ACCOUNT } from "@/lib/draft.mjs";
import { forecastInput, tomorrow, validPrediction } from "@/lib/weather.mjs";
import ClimateResults from "./ClimateResults";
import { useEvaluationDraft } from "./EvaluationDraft";
import Icon from "./Icon";
import PlaceSearch, { usePlaceSearchMode } from "./PlaceSearch";
import { useSession } from "./SiteShell";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder" role="status">Cargando mapa…</div>,
});
function SaveEvaluation({ result }) {
  const { user, ready, setUser } = useSession();
  const { beginHandoff } = useEvaluationDraft();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const entries = new FormData(event.currentTarget);
    try {
      const saved = await api("events", { method: "POST", body: {
        ...result.input, name: entries.get("name").trim(), alerts_enabled: entries.has("alerts"),
      } });
      router.push(`/eventos/${saved.id}?guardado=1`);
    } catch (failure) {
      if (failure.status === 401) setUser(null);
      setError(failure.message);
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!user) return <div className="save-area">
    {error && <p className="form-error" role="alert">{error}</p>}
    <Link className="button secondary" href={RESUME_ACCOUNT} onClick={beginHandoff}><Icon name="bookmark" size={18} /> Ingresar para guardar</Link>
  </div>;

  if (!showForm) return <button className="button secondary" type="button" onClick={() => setShowForm(true)}>
    <Icon name="bookmark" size={18} /> Guardar evento
  </button>;

  return <form className="save-form" onSubmit={save}>
    <label htmlFor="event-name">Nombre de tu evento</label>
    <input id="event-name" name="name" placeholder="Ej. Festival de verano" required maxLength={80} autoFocus />
    <label className="checkbox"><input type="checkbox" name="alerts" /> Avísame por correo si cambia el riesgo</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="actions">
      <button type="submit" className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      <button type="button" className="button text-button" disabled={busy} onClick={() => setShowForm(false)}>Cancelar</button>
    </div>
  </form>;
}

export default function Explore() {
  const placeMode = usePlaceSearchMode();
  const { draft: { coords, address, date, focus, result }, restored, updateDraft } = useEvaluationDraft();
  const [mapPoint, setMapPoint] = useState(null);
  const [minDate, setMinDate] = useState("");
  const [tileError, setTileError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const resultAnchor = useRef(null);
  const reverseRequest = useRef(null);
  const weatherRequest = useRef(null);

  useEffect(() => {
    setMinDate(tomorrow());
    return () => weatherRequest.current?.abort();
  }, []);

  useEffect(() => {
    if (result) resultAnchor.current?.focus();
  }, [result]);

  useEffect(() => {
    if (placeMode !== "autocomplete" || !mapPoint) return;
    const controller = new AbortController();
    reverseRequest.current = controller;
    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;
      let label;
      try {
        const data = await api("places/reverse", { method: "POST", body: mapPoint, signal: controller.signal });
        label = typeof data?.label === "string" ? data.label.trim() : "";
      } catch {
        // An absent address or provider error must not change the selected point.
      }
      if (controller.signal.aborted) return;
      updateDraft({ address: label ? { text: label, phase: "resolved" } : { text: "", phase: "unavailable" } });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mapPoint, placeMode, updateDraft]);

  function cancelReverse() {
    reverseRequest.current?.abort();
    setMapPoint(null);
  }

  function setPoint(lat, lon, nextAddress, nextFocus) {
    updateDraft({
      coords: { lat: lat.toFixed(6), lon: lon.toFixed(6) },
      address: nextAddress, focus: nextFocus, result: null,
    });
    setFormError("");
  }

  function pickMap(lat, lon) {
    if (busy) return;
    cancelReverse();
    setPoint(lat, lon, EMPTY_ADDRESS, null);
    setMapPoint({ lat, lon });
  }

  function pickAddress(lat, lon, zoom, label) {
    if (busy) return;
    cancelReverse();
    setPoint(lat, lon, label ? { text: label, phase: "selected" } : EMPTY_ADDRESS, { lat, lon, zoom });
  }

  function editAddress(text) {
    cancelReverse();
    updateDraft({ address: { text, phase: "typing" } });
  }

  function editCoordinate(name, value) {
    cancelReverse();
    updateDraft((previous) => ({
      coords: { ...previous.coords, [name]: value },
      address: previous.address.phase === "typing" ? previous.address : EMPTY_ADDRESS,
      focus: null, result: null,
    }));
  }

  const lat = Number(coords.lat), lon = Number(coords.lon);
  const position = coords.lat.trim() && coords.lon.trim() && Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
  const visibleAddress = placeMode === "autocomplete" && mapPoint && address.phase === "idle" ?
    { text: "", phase: "loading" } : address;

  async function run(event) {
    event.preventDefault();
    setFormError("");
    let input;
    try {
      input = forecastInput(coords.lat, coords.lon, date);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setBusy(true);
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    updateDraft({ result: null, focus: { lat: input.latitude, lon: input.longitude } });
    try {
      const data = await api("weather", { method: "POST", body: input, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!validPrediction(data) || data.fecha_objetivo !== date ||
          data.latitud !== input.latitude || data.longitud !== input.longitude) {
        throw new Error("El servicio devolvió una evaluación incompleta o para otra ubicación o fecha.");
      }
      updateDraft({ result: { input, data } });
    } catch (error) {
      if (!controller.signal.aborted) setFormError(error.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div>
        <p className="eyebrow"><span className="status-dot" /> Inteligencia climática para eventos</p>
        <h1 id="hero-title">Planifica tu evento <em>con anticipación.</em></h1>
        <p className="hero-description">Evalúa la probabilidad de lluvia, viento fuerte y temperaturas adversas antes de elegir el lugar o la fecha.</p>
      </div>
      <div className="hero-key" aria-label="Riesgos evaluados">
        <span><Icon name="rain" size={18} /> Lluvia</span>
        <span><Icon name="wind" size={18} /> Viento</span>
        <span><Icon name="temperature" size={18} /> Temperatura</span>
      </div>
    </section>

    <section className="workspace card" aria-labelledby="query-heading">
      <div className="workspace-form">
        <p className="eyebrow"><Icon name="pin" size={17} /> Nueva evaluación</p>
        <h2 id="query-heading">Lugar y fecha</h2>
        <p className="subtle">Elige el punto en el mapa o escribe las coordenadas de tu sede.</p>
        <PlaceSearch mode={placeMode} disabled={busy || !restored} onPick={pickAddress}
          address={visibleAddress} onAddressChange={editAddress} />
        <form onSubmit={run}>
          <fieldset disabled={busy || !restored}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="lat">Latitud</label>
                <input id="lat" type="number" inputMode="decimal" step="any" min="-90" max="90" required placeholder="Ej. 28.1901"
                  value={coords.lat} onChange={({ target }) => editCoordinate("lat", target.value)} />
              </div>
              <div className="field">
                <label htmlFor="lon">Longitud</label>
                <input id="lon" type="number" inputMode="decimal" step="any" min="-180" max="180" required placeholder="Ej. −105.4701"
                  value={coords.lon} onChange={({ target }) => editCoordinate("lon", target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="target-date">Fecha del evento</label>
              <input id="target-date" type="date" min={minDate || undefined} required value={date}
                aria-describedby="date-hint" onChange={({ target }) => updateDraft({ date: target.value, result: null })} />
              <p id="date-hint" className="field-hint">Elige una fecha posterior a hoy (UTC).</p>
            </div>
            <button type="submit" className="button primary large">
              {busy ? "Evaluando…" : "Evaluar riesgo"} <Icon name="arrow" size={18} />
            </button>
          </fieldset>
          {busy && <p className="field-hint" role="status">Consultando el modelo climatológico…</p>}
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </form>
        <p className="privacy-hint"><Icon name="info" size={17} /> No necesitas una cuenta para consultar.</p>
      </div>
      <div className="workspace-map" role="region" aria-label="Mapa de ubicación del evento">
        {restored && <LocationMap position={position} focus={focus} onPick={pickMap} onTileError={() => setTileError(true)}
          geoapifyAttribution={placeMode === "autocomplete"} />}
        <div className="map-caption"><Icon name="pin" size={17} />
          <span>{tileError ? "Hay teselas no disponibles. Puedes usar las coordenadas manuales." :
            position ? `Ubicación: ${lat.toFixed(4)}, ${lon.toFixed(4)}` : "Selecciona un punto en el mapa"}</span>
        </div>
      </div>
    </section>
    {result && <div className="results-anchor" ref={resultAnchor} tabIndex={-1} role="region" aria-label="Resultados de la consulta">
      <ClimateResults data={result.data} controls={<SaveEvaluation result={result} />} />
    </div>}
  </>;
}
