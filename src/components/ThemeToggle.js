"use client";

import { useEffect, useState } from "react";
import { DARK_SCHEME, THEME_KEY } from "@/lib/theme";
import Icon from "./Icon";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const system = window.matchMedia(DARK_SCHEME);
    function sync() {
      let preference;
      try { preference = localStorage.getItem(THEME_KEY); } catch {}
      const theme = preference === "dark" || preference === "light" ? preference : system.matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      setDark(theme === "dark");
    }
    function syncStorage(event) {
      if (event.key === THEME_KEY || event.key === null) sync();
    }
    sync();
    system.addEventListener("change", sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  function toggle() {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    setDark(theme === "dark");
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }

  return <button type="button" className="theme-toggle" aria-label="Modo oscuro" aria-pressed={dark}
    title={dark ? "Activar modo claro" : "Activar modo oscuro"} onClick={toggle}>
    <Icon name="moon" size={19} className="theme-moon" />
    <Icon name="sun" size={19} className="theme-sun" />
  </button>;
}
