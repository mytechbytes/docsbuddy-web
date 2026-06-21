// Scroll-reveal + count-up. The reveal CSS is gated behind html.js, so if this
// never runs (or IO is unavailable) the content is simply visible.
const reduce =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function countUp(el) {
  const target = parseFloat(el.dataset.count ?? "");
  if (Number.isNaN(target)) return;
  if (reduce || target === 0) {
    el.textContent = String(target);
    return;
  }
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = String(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const reveals = document.querySelectorAll("[data-reveal]");

if (!("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("is-visible"));
  document.querySelectorAll("[data-count]").forEach(countUp);
} else {
  // Start counters at zero so they animate up when scrolled into view.
  if (!reduce) {
    document.querySelectorAll("[data-count]").forEach((el) => {
      if (parseFloat(el.dataset.count ?? "") !== 0) el.textContent = "0";
    });
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  reveals.forEach((el) => io.observe(el));
}
