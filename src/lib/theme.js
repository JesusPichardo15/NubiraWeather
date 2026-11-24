export const THEME_KEY = "nubira.color-theme";
export const DARK_SCHEME = "(prefers-color-scheme: dark)";

// Apply the theme in the document head, before the page can paint.
export const themeBootstrap = `(() => {
  let theme;
  try { theme = localStorage.getItem(${JSON.stringify(THEME_KEY)}); } catch {}
  if (theme !== "light" && theme !== "dark") {
    theme = matchMedia(${JSON.stringify(DARK_SCHEME)}).matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();`;
