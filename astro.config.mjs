// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

/**
 * Vite 8 is newer than Astro's declared peer range, so Vite logs a few
 * deprecation advisories that are harmless for this static build. We mute ONLY
 * those exact strings (per project policy) and leave every other warning intact.
 */
const SILENCED = [
  "optimizeDeps.esbuildOptions",
  "rolldownOptions",
  "transformWithEsbuild",
  "transformWithOxc",
];

const baseWarn = console.warn.bind(console);
console.warn = (...args) => {
  const msg = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
  if (SILENCED.some((s) => msg.includes(s))) return;
  baseWarn(...args);
};

/** A Vite custom logger that drops the same deprecation noise. */
const quietLogger = {
  info(msg) {
    if (SILENCED.some((s) => msg.includes(s))) return;
    console.log(msg);
  },
  warn(msg) {
    if (SILENCED.some((s) => msg.includes(s))) return;
    baseWarn(msg);
  },
  warnOnce(msg) {
    if (SILENCED.some((s) => msg.includes(s))) return;
    baseWarn(msg);
  },
  error(msg) {
    console.error(msg);
  },
  clearScreen() {},
  hasErrorLogged() {
    return false;
  },
  hasWarned: false,
};

// https://astro.build/config
export default defineConfig({
  site: "https://docsbuddy.mytechbytes.in",
  output: "static",

  build: {
    // Clean per-page URLs: /privacy.html, /login-callback.html, etc.
    format: "file",
  },

  server: {
    port: 5173,
  },

  vite: {
    plugins: [tailwindcss()],
    customLogger: quietLogger,
  },

  adapter: cloudflare(),
});