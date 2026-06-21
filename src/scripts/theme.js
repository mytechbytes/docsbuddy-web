// Theme persistence. The pre-paint inline script in BaseLayout already applied
// the stored theme before first paint; this only wires the toggle control(s)
// and writes the choice back to localStorage.
const KEY = "db-theme";

function current() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode / storage disabled — non-fatal */
  }
}

for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
  btn.addEventListener("click", () => {
    apply(current() === "dark" ? "light" : "dark");
  });
}
