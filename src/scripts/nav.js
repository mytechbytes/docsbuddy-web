// Solidify the sticky header once the page is scrolled. Purely cosmetic — the
// header is fully styled without it.
const header = document.querySelector(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
