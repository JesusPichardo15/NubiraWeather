"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useEvaluationDraft } from "./EvaluationDraft";
import Icon from "./Icon";
import { useSession } from "./SiteShell";

const modes = {
  login: ["Inicia sesión", "Accede a tus eventos guardados y configura notificaciones."],
  register: ["Crea tu cuenta", "Te enviaremos un enlace para verificar tu correo y elegir una contraseña."],
  "forgot-password": ["Recupera tu contraseña", "Te enviaremos un enlace si ya tienes una cuenta verificada."],
  "resend-verification": ["Reenvía la verificación", "Solicita un enlace nuevo para verificar tu correo."],
};

function EmailField({ value, onChange }) {
  return <div className="field">
    <label htmlFor="email">Correo electrónico</label>
    <input id="email" name="email" type="email" inputMode="email" required autoComplete="email" maxLength={254}
      placeholder="tu@correo.com" value={value} onChange={({ target }) => onChange(target.value)} />
  </div>;
}

export function PasswordField({ id = "password", label = "Contraseña", fresh = false, confirmation = false }) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <input id={id} name={id} type="password" required minLength={fresh ? 12 : undefined} maxLength={128}
      autoComplete={fresh ? "new-password" : "current-password"}
      aria-describedby={fresh && !confirmation ? `${id}-hint` : undefined} />
    {fresh && !confirmation && <p className="field-hint" id={`${id}-hint`}>Usa al menos 12 caracteres.</p>}
  </div>;
}

function Profile({ user, setUser }) {
  const { clearDraft } = useEvaluationDraft();
  const [result, setResult] = useState({});
  const [busy, setBusy] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function doAction(action, body, method = "POST") {
    setBusy(action);
    setResult({});
    try {
      const response = await api(`account/${action}`, { method, body });
      if (action === "me") {
        setUser(response);
        setResult({ message: "Perfil actualizado." });
      } else {
        setUser(null);
        clearDraft();
        if (action === "change-password") router.replace("/cuenta?actualizada=1");
        else router.replace("/");
      }
    } catch (error) {
      setResult({ error: error.message });
      if (error.status === 401) setUser(null);
    } finally {
      setBusy("");
    }
  }

  return <div className="account-layout profile-layout">
    <div className="page-intro"><p className="eyebrow"><Icon name="person" size={17} /> Mi cuenta</p>
      <h1>Tu perfil</h1><p className="subtle">Administra tu nombre y la seguridad de tu cuenta.</p></div>
    <div className="card form-card">
      <form onSubmit={(event) => {
        event.preventDefault();
        doAction("me", { name: new FormData(event.currentTarget).get("name").trim() }, "PATCH");
      }}>
        <fieldset disabled={Boolean(busy)}>
          <div className="field"><label htmlFor="name">Nombre</label>
            <input id="name" name="name" autoComplete="name" defaultValue={user.name} maxLength={80} required /></div>
          <div className="field"><label htmlFor="profile-email">Correo verificado</label>
            <input id="profile-email" value={user.email} readOnly /></div>
          <button className="button primary" type="submit">{busy === "me" ? "Guardando…" : "Guardar cambios"}</button>
        </fieldset>
      </form>
      <div className="account-divider" />
      {showPassword ? <form onSubmit={(event) => {
        event.preventDefault();
        const entries = new FormData(event.currentTarget);
        if (entries.get("password") !== entries.get("confirmation")) {
          setResult({ error: "Las contraseñas no coinciden." });
          return;
        }
        doAction("change-password", { current_password: entries.get("current"), password: entries.get("password") });
      }}>
        <fieldset disabled={Boolean(busy)}>
          <PasswordField id="current" label="Contraseña actual" />
          <PasswordField label="Nueva contraseña" fresh />
          <PasswordField id="confirmation" label="Confirma la nueva contraseña" fresh confirmation />
          <div className="actions">
            <button className="button primary" type="submit">{busy === "change-password" ? "Actualizando…" : "Actualizar contraseña"}</button>
            <button className="button text-button" type="button" onClick={() => { setShowPassword(false); setResult({}); }}>Cancelar</button>
          </div>
        </fieldset>
      </form> : <button className="button secondary" type="button" disabled={Boolean(busy)} onClick={() => setShowPassword(true)}>Cambiar contraseña</button>}
      {result.error && <p className="form-error" role="alert">{result.error}</p>}
      {result.message && <p className="success-message" role="status">{result.message}</p>}
      <div className="account-divider" />
      <button className="button text-button" type="button" disabled={Boolean(busy)} onClick={() => doAction("logout")}>
        {busy === "logout" ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </div>
  </div>;
}

export default function Account({ passwordChanged = false, continueEvaluation = false }) {
  const { user, ready, setUser } = useSession();
  const { resumeDraft } = useEvaluationDraft();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [hidePasswordChanged, setHidePasswordChanged] = useState(false);
  const router = useRouter();
  const [title, description] = modes[mode];

  function changeMode(next) {
    setMode(next);
    setError("");
    setSent(false);
    setHidePasswordChanged(true);
  }

  async function submit(event) {
    event.preventDefault();
    const entries = new FormData(event.currentTarget);
    const body = { email: email.trim() };
    if (mode === "login") body.password = entries.get("password");
    if (mode === "register") body.name = entries.get("name").trim();
    setBusy(true);
    setError("");
    setHidePasswordChanged(true);
    try {
      const response = await api(`account/${mode}`, { method: "POST", body });
      if (mode === "login") {
        setUser(response);
        router.replace(continueEvaluation && resumeDraft() ? "/" : "/eventos");
      } else {
        setSent(true);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p className="state-panel" role="status">Cargando tu cuenta…</p>;
  if (user) return <Profile user={user} setUser={setUser} />;
  return <div className="account-layout">
    <div className="page-intro"><p className="eyebrow"><Icon name="person" size={17} /> Cuenta Nubira</p>
      <h1>{title}</h1><p className="subtle">{description}</p></div>
    <div className="card form-card">
      {passwordChanged && !hidePasswordChanged && <p className="success-message" role="status">Contraseña actualizada. Inicia sesión con la nueva.</p>}
      {sent ? <div className="account-success" role="status">
        <span className="tile-icon"><Icon name="mail" /></span>
        <h2>Revisa tu bandeja de entrada</h2>
        <p className="subtle">Si corresponde, recibirás un mensaje en <strong>{email}</strong>. Revisa también la carpeta de correo no deseado.</p>
        {continueEvaluation && (mode === "register" || mode === "resend-verification") && <p className="subtle">
          Si verificas el correo en otro navegador o dispositivo, vuelve a esta pestaña para iniciar sesión y retomar tu consulta.
        </p>}
        <button className="button secondary" type="button" onClick={() => changeMode("login")}>Volver a iniciar sesión</button>
      </div> : <>
        {(mode === "login" || mode === "register") && <div className="account-tabs">
          <button type="button" aria-pressed={mode === "login"} disabled={busy} onClick={() => changeMode("login")}>Ingresar</button>
          <button type="button" aria-pressed={mode === "register"} disabled={busy} onClick={() => changeMode("register")}>Registrarme</button>
        </div>}
        <form onSubmit={submit} key={mode}>
          <fieldset disabled={busy}>
            {mode === "register" && <div className="field"><label htmlFor="name">Nombre</label>
              <input id="name" name="name" required maxLength={80} autoComplete="name" placeholder="Tu nombre" /></div>}
            <EmailField value={email} onChange={setEmail} />
            {mode === "login" && <PasswordField />}
            <button className="button primary large" type="submit">
              {busy ? "Procesando…" : mode === "login" ? "Iniciar sesión" : mode === "register" ? "Enviar enlace" : "Enviar correo"}
              <Icon name="arrow" size={18} />
            </button>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <div className="account-links">
          {mode === "login" ? <>
            <button className="link-button" type="button" disabled={busy} onClick={() => changeMode("forgot-password")}>Olvidé mi contraseña</button>
            <button className="link-button" type="button" disabled={busy} onClick={() => changeMode("resend-verification")}>Reenviar verificación</button>
          </> : <button className="link-button" type="button" disabled={busy} onClick={() => changeMode("login")}>Volver a ingresar</button>}
        </div>
      </>}
    </div>
    <Link className="inline-link" href="/"><Icon name="back" size={17} /> Explorar sin una cuenta</Link>
  </div>;
}
