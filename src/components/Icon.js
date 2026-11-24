export default function Icon({ name, size = 22, ...props }) {
  const lines = {
    cloud: <><path d="M6 16.5a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.2 1.1A4 4 0 0 1 18 16.5H6Z"/><path d="m9 20 1-1.5m4 1.5 1-1.5"/></>,
    rain: <><path d="M5.5 15a4 4 0 1 1 .1-8 5.5 5.5 0 0 1 10.2 1.4A3.4 3.4 0 1 1 18 15H5.5Z"/><path d="m8 18-1 2m5-2-1 2m5-2-1 2"/></>,
    wind: <><path d="M3 8h12a2.5 2.5 0 1 0-2.5-2.5M2 12h17a2.5 2.5 0 1 1-2.5 2.5M4 16h7a2.5 2.5 0 1 1-2.5 2.5"/></>,
    temperature: <><path d="M9 14.5V5a3 3 0 1 1 6 0v9.5a5 5 0 1 1-6 0Z"/><path d="M12 9v8"/><circle cx="12" cy="18" r="1"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2"/></>,
    chart: <><path d="M4 4v16h16M9 15v-3m5 3V8m5 7V5"/></>,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
    back: <path d="M20 12H5m6 6-6-6 6-6"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
    bookmark: <path d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4Z"/>,
    person: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    moon: <path d="M20.8 14.2A8.8 8.8 0 0 1 9.8 3.2a8.9 8.9 0 1 0 11 11Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 6-2 7-2 9h16c0-2-2-3-2-9m-8 12a2 2 0 0 0 4 0"/></>,
  };
  return <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"
    strokeLinejoin="round" viewBox="0 0 24 24" width={size} height={size} {...props}>{lines[name]}</svg>;
}
