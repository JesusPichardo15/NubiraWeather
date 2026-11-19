"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RISKS, dateLabel, numberLabel, tomorrow, validPrediction } from "@/lib/weather.mjs";
import ClimateResults from "./ClimateResults";
import Icon from "./Icon";
import { useSession } from "./SiteShell";

function EventsGate({ children }) {
  const { user, ready } = useSession();
  if (!ready) return <p className="state-panel" role="status">Comprobando tu sesión…</p>;
  if (!user) return <div className="card empty-state">
    <span className="tile-icon"><Icon name="bookmark" /></span>
    <h2>Tu historial es privado</h2>
    <p className="subtle">Inicia sesión para ver y administrar tus eventos guardados.</p>
    <Link href="/cuenta" className="button primary">Iniciar sesión <Icon name="arrow" size={17} /></Link>
  </div>;
  return children;
}

function useEvents(resource) {
  const { setUser } = useSession();
  const [state, setState] = useState({ pending: true });
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setState({ pending: true });
    setAttempt((previous) => previous + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    api(resource, { signal: controller.signal }).then((data) => setState({ data })).catch((error) => {
      if (error.name !== "AbortError") {
        if (error.status === 401) setUser(null);
        setState({ error });
      }
    });
    return () => controller.abort();
  }, [resource, attempt, setUser]);
  return { ...state, retry, replace: (data) => setState({ data }) };
}

function EventError({ error, retry }) {
  return <div className="card empty-state" role="alert">
    <span className="tile-icon"><Icon name="info" /></span>
    <h2>{error.status === 404 ? "Evento no encontrado" : "No pudimos cargar tus eventos"}</h2>
    <p className="subtle">{error.message}</p>
    {error.status === 404 ? <Link href="/eventos" className="button secondary">Volver a mis eventos</Link> :
      <button className="button secondary" type="button" onClick={retry}>Reintentar</button>}
  </div>;
}

function EventList() {
  const { data, pending, error, retry } = useEvents("events");
  if (pending) return <p className="state-panel" role="status">Cargando tus eventos…</p>;
  if (error) return <EventError error={error} retry={retry} />;
  if (!data.length) return <div className="card empty-state">
    <span className="tile-icon"><Icon name="calendar" /></span>
    <h2>Aún no tienes eventos</h2>
    <p className="subtle">Haz una evaluación y guárdala para volver a consultarla desde aquí.</p>
    <Link className="button primary" href="/">Hacer una evaluación <Icon name="arrow" size={17} /></Link>
  </div>;
  return <ul className="event-list">
    {data.map((event) => <li className="card event-card" key={event.id}>
      <div className="event-card-top">
        <span className="tile-icon"><Icon name="calendar" /></span>
        <span className={event.target_date < tomorrow() ? "badge past" : "badge"}>{event.target_date < tomorrow() ? "Finalizado" : "Próximo"}</span>
      </div>
      <h2><Link href={`/eventos/${event.id}`}>{event.name}</Link></h2>
      <p className="subtle">{dateLabel(event.target_date)}</p>
      <p className="event-location"><Icon name="pin" size={16} /> {numberLabel(event.latitude, 5)}°, {numberLabel(event.longitude, 5)}°</p>
      {validPrediction(event.prediction) && <div className="event-risks">
        {RISKS.map(({ key, name, icon }) => <span key={key}><Icon name={icon} size={16} />
          <span className="sr-only">{name}: </span>{numberLabel(event.prediction[key])}%</span>)}
      </div>}
      <Link href={`/eventos/${event.id}`} className="inline-link" aria-label={`Ver evaluación de ${event.name}`}>Ver evaluación <Icon name="arrow" size={17} /></Link>
    </li>)}
  </ul>;
}

export function EventsIndex() {
  return <>
    <div className="page-intro section-header">
      <div><p className="eyebrow"><Icon name="calendar" size={17} /> Planificación</p>
        <h1>Mis eventos</h1><p className="subtle">Consulta tus evaluaciones guardadas y administra las alertas de cada evento.</p></div>
      <Link className="button primary" href="/"><Icon name="plus" size={18} /> Nueva evaluación</Link>
    </div>
    <EventsGate><EventList /></EventsGate>
  </>;
}

function EventDetail({ id, saved }) {
  const { data, pending, error, retry, replace } = useEvents(`events/${id}`);
  const { setUser } = useSession();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState(null);
  const [feedback, setFeedback] = useState(saved ? { message: "Evento guardado." } : {});

  async function update(method, patch, message) {
    if (typeof patch?.alerts_enabled === "boolean") setPendingAlerts(patch.alerts_enabled);
    setBusy(true);
    setFeedback({});
    try {
      const updated = await api(`events/${id}`, { method, body: patch });
      if (method === "DELETE") {
        router.replace("/eventos");
        return;
      }
      replace(updated);
      setFeedback({ message });
      setEditing(false);
    } catch (failure) {
      if (failure.status === 401) setUser(null);
      setFeedback({ error: failure.message });
    } finally {
      setPendingAlerts(null);
      setBusy(false);
    }
  }

  if (pending) return <p className="state-panel" role="status">Cargando evaluación…</p>;
  if (error) return <EventError error={error} retry={retry} />;
  const past = data.target_date < tomorrow();
  return <>
    <div className="page-intro">
      <p className="eyebrow"><Icon name="calendar" size={17} /> Evento guardado</p>
      <h1>{data.name}</h1>
      <p className="subtle">{dateLabel(data.target_date)}{past ? " · Finalizado" : ""}</p>
    </div>
    <section className="card manage-event" aria-labelledby="manage-heading">
      <h2 id="manage-heading">Gestionar evento</h2>
      <div className="actions">
        {!editing && !deleting && <>
          <button className="button secondary" type="button" disabled={busy} onClick={() => setEditing(true)}>Renombrar</button>
          <button className="button danger-outline" type="button" disabled={busy} onClick={() => setDeleting(true)}>Eliminar evento</button>
        </>}
      </div>
      {editing && <form onSubmit={(event) => {
        event.preventDefault();
        const name = new FormData(event.currentTarget).get("name").trim();
        update("PATCH", { name }, "Nombre actualizado.");
      }}>
        <fieldset disabled={busy}>
          <div className="field"><label htmlFor="rename">Nombre del evento</label>
            <input id="rename" name="name" defaultValue={data.name} maxLength={80} required autoFocus /></div>
          <div className="actions">
            <button className="button primary" type="submit">Guardar nombre</button>
            <button className="button text-button" type="button" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </fieldset>
      </form>}
      {deleting && <div className="delete-confirm">
        <p>¿Eliminar «{data.name}»? No podrás recuperar su evaluación ni sus alertas.</p>
        <div className="actions">
          <button className="button secondary" type="button" disabled={busy} autoFocus onClick={() => setDeleting(false)}>Cancelar</button>
          <button className="button danger" type="button" disabled={busy} onClick={() => update("DELETE")}>
            {busy ? "Eliminando…" : "Confirmar eliminación"}
          </button>
        </div>
      </div>}
      <label className="checkbox checkbox-alert">
        <input type="checkbox" checked={pendingAlerts ?? data.alerts_enabled} disabled={busy || (!data.alerts_enabled && past)}
          onChange={({ target }) => update("PATCH", { alerts_enabled: target.checked }, target.checked ? "Alertas activadas." : "Alertas desactivadas.")}
          aria-describedby="alert-hint" />
        <span><strong>Alertas por correo</strong>
          <small id="alert-hint">{pendingAlerts !== null ? "Actualizando preferencia…" : past ?
            "Las alertas se detienen cuando llega la fecha del evento." : "Recibe un correo si la evaluación climatológica cambia de forma relevante."}</small>
        </span>
      </label>
      {feedback.error && <p className="form-error" role="alert">{feedback.error}</p>}
      {feedback.message && <p className="success-message" role="status">{feedback.message}</p>}
    </section>
    {validPrediction(data.prediction) ? <ClimateResults data={data.prediction} controls={
      <p className="subtle updated">Última evaluación: {dateLabel(data.evaluated_at.slice(0, 10))}</p>
    } /> : <p className="form-error" role="alert">Esta evaluación guardada está incompleta.</p>}
  </>;
}

export function SavedEvent({ id, saved }) {
  return <>
    <Link href="/eventos" className="inline-link back-link"><Icon name="back" size={17} /> Mis eventos</Link>
    <EventsGate><EventDetail key={id} id={id} saved={saved} /></EventsGate>
  </>;
}
