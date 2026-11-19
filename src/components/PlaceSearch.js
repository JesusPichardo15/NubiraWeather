"use client";

import { useEffect, useId, useState } from "react";
import { api } from "@/lib/api";
import Icon from "./Icon";

const MIN_QUERY = 4;
const SEARCH_DELAY_MS = 350;

function AddressAutocomplete({ onPick, disabled }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);
  const [response, setResponse] = useState(null);
  const term = query.trim().replace(/\s+/g, " ");
  const searching = open && !selected && !composing && !disabled && term.length >= MIN_QUERY;
  const current = response?.term === term ? response : null;
  const settled = Boolean(current?.options);
  const options = searching ? current?.options || [] : [];
  const expanded = options.length > 0;
  const listId = `${id}-suggestions`;

  useEffect(() => {
    if (!searching || settled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await api("places/autocomplete", { method: "POST", body: { query: term }, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error("No pudimos mostrar las sugerencias. Usa el mapa o las coordenadas.");
        setResponse({ term, options: data });
      } catch (error) {
        if (!controller.signal.aborted) setResponse({
          term, error: error.status === 429 ? "Espera un momento antes de volver a buscar." : error.message,
        });
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searching, settled, term]);

  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, listId]);

  function pick(option) {
    if (disabled || !option) return;
    setSelected(true);
    setOpen(false);
    setActive(-1);
    setQuery(option.label);
    onPick(option.lat, option.lon, option.zoom);
  }

  function keyboard(event) {
    if (composing || event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (selected || term.length < MIN_QUERY) return;
      event.preventDefault();
      setOpen(true);
      const count = current?.options?.length || 0;
      if (!count) return;
      setActive((index) => {
        if (event.key === "ArrowDown") return (index + 1) % count;
        return index <= 0 ? count - 1 : index - 1;
      });
    } else if (event.key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      pick(options[active]);
    }
  }

  return <div className="field address-search">
    <label htmlFor={id}>Dirección de la sede</label>
    <div className="address-control">
      <input id={id} type="text" role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={`${id}-hint`} autoComplete="off" maxLength={140} disabled={disabled}
        placeholder="Calle, número y ciudad" value={query} onKeyDown={keyboard}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
        onFocus={() => { if (!selected) setOpen(true); }} onBlur={() => { setOpen(false); setActive(-1); }}
        onChange={({ target }) => { setQuery(target.value); setSelected(false); setOpen(true); setActive(-1); }} />
      {expanded && <ul className="address-options" role="listbox" id={listId} aria-label="Direcciones sugeridas">
        {options.map((option, index) => <li key={`${option.lat}:${option.lon}:${option.label}`}
          id={`${listId}-${index}`} role="option" aria-selected={active === index}
          onMouseDown={(event) => event.preventDefault()} onClick={() => pick(option)}>
          <Icon name="pin" size={17} /><span>{option.label}</span>
        </li>)}
      </ul>}
    </div>
    <p className="field-hint" id={`${id}-hint`}>Elige una sugerencia o ajusta el punto en el mapa. No incluyas datos privados. Sugerencias de <a href="https://www.geoapify.com/">Geoapify</a>.</p>
    <div className="sr-only" role="status">{expanded ? `${options.length} sugerencias disponibles.` : ""}</div>
    {searching && !current && <p className="field-hint" role="status">Buscando direcciones…</p>}
    {searching && current?.options?.length === 0 && <p className="field-hint" role="status">No encontramos coincidencias. Prueba con la ciudad y el código postal.</p>}
    {searching && current?.error && <p className="form-error" role="alert">{current.error}</p>}
  </div>;
}

function ManualPlaceSearch({ onPick, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState(null);

  async function submit(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("query").trim();
    setBusy(true);
    setError("");
    setOptions(null);
    try {
      setOptions(await api("places", { method: "POST", body: { query } }));
    } catch (failure) {
      setError(failure.status === 429 ? "Espera un momento antes de volver a buscar." : failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <details className="place-search">
    <summary>Buscar una ciudad o lugar</summary>
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="place-query">Nombre del lugar</label>
      <div className="search-row">
        <input id="place-query" name="query" minLength={3} maxLength={140} required placeholder="Ej. Delicias, Chihuahua" />
        <button type="submit" className="button secondary" disabled={busy || disabled}>{busy ? "Buscando…" : "Buscar"}</button>
      </div>
      <p className="field-hint">La búsqueda se envía al proveedor de mapas. No incluyas datos privados.</p>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {options?.length === 0 && <p className="field-hint" role="status">No encontramos coincidencias.</p>}
    {options?.length > 0 && <ul className="place-results" aria-label="Lugares encontrados">
      {options.map(({ lat, lon, label }, index) => <li key={`${lat}:${lon}:${index}`}>
        <button className="link-button" type="button" disabled={disabled} onClick={() => { onPick(lat, lon); setOptions(null); }}>{label}</button>
      </li>)}
    </ul>}
  </details>;
}

export default function PlaceSearch({ onPick, disabled }) {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    api("places", { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setMode(data.autocomplete ? "autocomplete" : data.enabled ? "manual" : null);
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  if (mode === "autocomplete") return <AddressAutocomplete onPick={onPick} disabled={disabled} />;
  if (mode === "manual") return <ManualPlaceSearch onPick={onPick} disabled={disabled} />;
  return null;
}
