"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import EvaluationDraftProvider from "./EvaluationDraft";
import Icon from "./Icon";

const Session = createContext(null);

export function useSession() {
  return useContext(Session);
}

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const [session, setSession] = useState({ user: null, ready: false });
  const changed = useRef(false);
  const setUser = useCallback((user) => {
    changed.current = true;
    setSession({ user, ready: true });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api("account/me", { signal: controller.signal }).then((user) => {
      if (!changed.current) setSession({ user, ready: true });
    }).catch((error) => {
      if (error.name !== "AbortError" && !changed.current) setSession({ user: null, ready: true });
    });
    return () => controller.abort();
  }, []);

  return <Session.Provider value={{ ...session, setUser }}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="site-head">
      <div className="shell head-inner">
        <Link className="brand" href="/" aria-label="Nubira Weather, inicio">
          <span className="brand-icon"><Icon name="cloud" size={23} /></span><span>Nubira<span className="brand-weather"> Weather</span></span>
        </Link>
        <nav className="site-nav" aria-label="Principal">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Explorar</Link>
          <Link href="/eventos" aria-current={pathname.startsWith("/eventos") ? "page" : undefined}>Mis eventos</Link>
          <Link className="account-nav" href="/cuenta" aria-current={pathname.startsWith("/cuenta") ? "page" : undefined}>
            <Icon name="person" size={17} /><span>{session.user ? "Mi cuenta" : "Ingresar"}</span>
          </Link>
        </nav>
      </div>
    </header>
    <main id="contenido" className="shell main" tabIndex={-1}>
      <EvaluationDraftProvider>{children}</EvaluationDraftProvider>
    </main>
    <footer className="site-footer shell">
      <span className="footer-brand"><Icon name="cloud" size={19} /> Nubira Weather</span>
      <span>Estimaciones climatológicas para planificar con anticipación.</span>
    </footer>
  </Session.Provider>;
}
