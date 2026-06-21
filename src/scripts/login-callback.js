// Auth bridge: hand the browser back to the installed app via the custom scheme,
// preserving BOTH the query string and the hash (Supabase puts tokens in either).
// Config comes from data-* attributes so the page stays data-driven from site.json.
const root = document.querySelector("[data-login-callback]");

if (root) {
  const scheme = root.dataset.scheme ?? "";
  const playUrl = root.dataset.play ?? "";
  const deepLink = scheme + (window.location.search || "") + (window.location.hash || "");

  const openApp = () => {
    // Assigning location triggers the OS to route to the installed app.
    window.location.href = deepLink;
  };

  const openBtn = document.getElementById("openApp");
  if (openBtn) {
    openBtn.setAttribute("href", deepLink);
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openApp();
    });
  }

  const playBtn = document.getElementById("playBtn");
  if (playBtn && playUrl) playBtn.setAttribute("href", playUrl);

  // Attempt the handoff automatically; the small delay lets the page paint first.
  setTimeout(openApp, 250);
}
