"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PasswordField } from "./Account";
import Icon from "./Icon";
import { useSession } from "./SiteShell";

export default function AccountLink({ verify }) {
  const { setUser } = useSession();
  const router = useRouter();
  const [known, setKnown] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const token = useRef(null);

  useEffect(() => {
    if (!token.current) {
      const value = new URLSearchParams(location.hash.slice(1)).get("token");
      if (/^[A-Za-z0-9_-]{43}$/.test(value || "")) token.current = value;
      if (location.hash) history.replaceState(null, "", location.pathname);
    }
    setKnown(true);
  }, []);

  async function submit(event) {
    event.preventDefault();
    const entries = new FormData(event.currentTarget);
    if (entries.get("password") !== entries.get("confirmation")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api(`account/${verify ? "verify" : "reset-password"}`, {
        method: "POST", body: { token: token.current, password: entries.get("password") },
      });
      if (!verify) {
        setUser(null);
        router.replace("/cuenta?actualizada=1");
      } else {
        token.current = null;
        setDone(response.message);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="account-layout">
    <div className="page-intro">
      <p className="eyebrow"><Icon name="mail" size={17} /> Cuenta Nubira</p>
      <h1>{verify ? "Verifica tu correo" : "Restablece tu contraseña"}</h1>
      <p className="subtle">{verify ? "Elige una contraseña para activar tu cuenta." : "Elige una contraseña nueva. Tus sesiones anteriores se cerrarán."}</p>
    </div>
    <div className="card form-card">
      {done ? <><p className="success-message" role="status">{done}</p><Link href="/cuenta" className="button primary">Ir a mi cuenta</Link></> :
        !known ? <p role="status">Comprobando enlace…</p> :
        !token.current ? <><p className="form-error" role="alert">El enlace está incompleto. Solicita uno nuevo.</p>
          <Link className="button secondary" href="/cuenta">Volver a cuenta</Link></> :
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <PasswordField label={verify ? "Elige tu contraseña" : "Nueva contraseña"} fresh />
            <PasswordField id="confirmation" label="Confirma la contraseña" fresh confirmation />
            <button className="button primary large" type="submit">{busy ? "Procesando…" : verify ? "Activar cuenta" : "Guardar contraseña"}</button>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>}
    </div>
    <Link className="inline-link" href="/cuenta"><Icon name="back" size={17} /> Volver a cuenta</Link>
  </div>;
}
