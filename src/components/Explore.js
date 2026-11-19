"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { DRAFT_KEY } from "@/lib/draft";
import { forecastInput, tomorrow, validPrediction } from "@/lib/weather.mjs";
import ClimateResults from "./ClimateResults";
import Icon from "./Icon";
import PlaceSearch, { usePlaceSearchMode } from "./PlaceSearch";
import { useSession } from "./SiteShell";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder" role="status">Cargando mapa…</div>,
});
const EMPTY_ADDRESS = { text: "", phase: "idle" };

function SaveEvaluation({ result, setNotice }) {
  const { user, ready, setUser } = useSession();
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
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      router.push(`/eventos/${saved.id}?guardado=1`);
    } catch (failure) {
      if (failure.status === 401) setUser(null);
      setError(failure.message);
      setBusy(false);
    }
  }

  function keepDraft(event) {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(result));
    } catch {
      event.preventDefault();
      setNotice("No se puede conservar la consulta en esta pestaña. Puedes iniciar sesión en otra pestaña y volver a consultar.");
    }
  }

  if (!ready) return null;
  if (!user) return <div className="save-area">
    {error && <p className="form-error" role="alert">{error}</p>}
    <Link className="button secondary" href="/cuenta" onClick={keepDraft}><Icon name="bookmark" size={18} /> Ingresar para guardar</Link>
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
  const [coords, setCoords] = useState({ lat: "", lon: "" });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [mapPoint, setMapPoint] = useState(null);
  const [date, setDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [focus, setFocus] = useState(null);
  const [tileError, setTileError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);
  const resultAnchor = useRef(null);
  const reverseRequest = useRef(null);

  useEffect(() => {
    setMinDate(tomorrow());
    if (new URLSearchParams(location.search).get("restaurar") !== "1") return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
      if (validPrediction(draft?.data)) {
        const { latitud, longitud, fecha_objetivo } = draft.data;
        const input = forecastInput(latitud, longitud, fecha_objetivo);
        setResult({ input, data: draft.data });
        setCoords({ lat: String(latitud), lon: String(longitud) });
        setDate(fecha_objetivo);
        setFocus({ lat: latitud, lon: longitud });
      }
    } catch {
      setNotice("No se pudo recuperar la consulta anterior. Puedes hacer una nueva.");
    }
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
      setAddress(label ? { text: label, phase: "resolved" } : { text: "", phase: "unavailable" });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mapPoint, placeMode]);

  function cancelReverse() {
    reverseRequest.current?.abort();
    setMapPoint(null);
  }

  function setPoint(lat, lon) {
    setCoords({ lat: lat.toFixed(6), lon: lon.toFixed(6) });
    setFormError("");
  }

  function pickMap(lat, lon) {
    if (busy) return;
    cancelReverse();
    setPoint(lat, lon);
    setMapPoint({ lat, lon });
    setAddress({ text: "", phase: "loading" });
  }

  function pickAddress(lat, lon, zoom, label) {
    if (busy) return;
    cancelReverse();
    setPoint(lat, lon);
    setFocus({ lat, lon, zoom });
    setAddress(label ? { text: label, phase: "selected" } : EMPTY_ADDRESS);
  }

  function editAddress(text) {
    cancelReverse();
    setAddress({ text, phase: "typing" });
  }

  function editCoordinate(name, value) {
    cancelReverse();
    setAddress((previous) => previous.phase === "typing" ? previous : EMPTY_ADDRESS);
    setCoords((previous) => ({ ...previous, [name]: value }));
  }

  const lat = Number(coords.lat), lon = Number(coords.lon);
  const position = coords.lat.trim() && coords.lon.trim() && Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;

  async function run(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    let input;
    try {
      input = forecastInput(coords.lat, coords.lon, date);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setBusy(true);
    setResult(null);
    setFocus({ lat: input.latitude, lon: input.longitude });
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    try {
      const data = await api("weather", { method: "POST", body: input });
      if (!validPrediction(data) || data.fecha_objetivo !== date ||
          data.latitud !== input.latitude || data.longitud !== input.longitude) {
        throw new Error("El servicio devolvió una evaluación incompleta o para otra ubicación o fecha.");
      }
      setResult({ input, data });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
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
        <PlaceSearch mode={placeMode} disabled={busy} onPick={pickAddress} address={address} onAddressChange={editAddress} />
        <form onSubmit={run}>
          <fieldset disabled={busy}>
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
                aria-describedby="date-hint" onChange={({ target }) => setDate(target.value)} />
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
        <LocationMap position={position} focus={focus} onPick={pickMap} onTileError={() => setTileError(true)}
          geoapifyAttribution={placeMode === "autocomplete"} />
        <div className="map-caption"><Icon name="pin" size={17} />
          <span>{tileError ? "Hay teselas no disponibles. Puedes usar las coordenadas manuales." :
            position ? `Ubicación: ${lat.toFixed(4)}, ${lon.toFixed(4)}` : "Selecciona un punto en el mapa"}</span>
        </div>
      </div>
    </section>
    {notice && <p className="form-error" role="status">{notice}</p>}
    {result && <div className="results-anchor" ref={resultAnchor} tabIndex={-1} role="region" aria-label="Resultados de la consulta">
      <ClimateResults data={result.data} controls={<SaveEvaluation result={result} setNotice={setNotice} />} />
    </div>}
  </>;
}
