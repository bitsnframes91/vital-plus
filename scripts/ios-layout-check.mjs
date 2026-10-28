// iOS layout check: serves the native bundle (run `bun run build:mobile` first) from dist-mobile/client,
// renders the main screens in headless Chrome at iPhone and iPad sizes (portrait, landscape, Split View)
// and fails if a screen overflows horizontally, shows the desktop phone frame, or cuts off a dialog.
// Usage: node scripts/ios-layout-check.mjs [repoRoot] [outDir] [label]
//   CHROME_PATH=/path/to/chrome   PAGES=heute,profil   SHOTS=all (or viewport_page keys) for PNGs
// Nothing leaves the machine: Supabase and the hosted app are blocked and a local, confirmed test
// session is seeded so signed-in screens render. Not a substitute for testing on a real iPad.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const [repoRoot = process.cwd(), outDir = join(tmpdir(), "vital-plus-layout"), label = "run"] =
  process.argv.slice(2);
const root = join(repoRoot, "dist-mobile", "client");
mkdirSync(outDir, { recursive: true });
const env = readFileSync(join(repoRoot, ".env"), "utf8");
const projectId = env.match(/^VITE_SUPABASE_PROJECT_ID="?([a-z0-9]+)"?/m)?.[1];
if (!projectId) throw new Error("project id not found");

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(root, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4173, "127.0.0.1", r));

const chromePath =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].find((p) => existsSync(p));
if (!chromePath) throw new Error("Chrome not found; set CHROME_PATH");
if (!existsSync(join(root, "index.html")))
  throw new Error("dist-mobile/client missing; run bun run build:mobile");
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=9333",
    "--no-first-run",
    "--disable-gpu",
    `--user-data-dir=${join(outDir, ".chrome-profile")}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
let version;
for (let i = 0; i < 50 && !version; i++) {
  try {
    version = await (await fetch("http://127.0.0.1:9333/json/version")).json();
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (m) =>
      m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result),
    );
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const now = Math.floor(Date.now() / 1000);
const session = {
  access_token: "layout-test-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: now + 3600,
  refresh_token: "layout-test-refresh",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "layout@example.com",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
};
// The Capacitor shell marks <html data-native-app="ios"> (src/mobile/native-shell.ts); headless Chrome
// is not a native platform, so the mark is set here to apply the same native.css rules as the app.
const seed = `try{localStorage.setItem(${JSON.stringify(`sb-${projectId}-auth-token`)}, ${JSON.stringify(JSON.stringify(session))});}catch(e){}
const markNative = () => document.documentElement && document.documentElement.setAttribute("data-native-app", "ios");
markNative(); document.addEventListener("readystatechange", markNative);`;

const viewports = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-15-pro", width: 393, height: 852 },
  { name: "ipad-mini-portrait", width: 744, height: 1133 },
  { name: "ipad-mini-landscape", width: 1133, height: 744 },
  { name: "ipad-portrait", width: 820, height: 1180 },
  { name: "ipad-landscape", width: 1180, height: 820 },
  { name: "ipad-pro-13-portrait", width: 1024, height: 1366 },
  { name: "ipad-pro-13-landscape", width: 1366, height: 1024 },
  { name: "ipad-split-half", width: 507, height: 1024 },
];
const pages = (
  process.env.PAGES ??
  "~,login,login?mode=register,reset-password,onboarding,heute,ernaehrung,gesundheit,trends,labor,plan,profil,profil/settings,profil/personal,profil/personal#dialog"
)
  .split(",")
  .map((p) => "/" + (p === "~" ? "" : p.replace(/^.*?(?=[a-z~])/, "")));

const measure = `(() => {
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth - vw;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.closest(".sr-only")) continue;
    if (r.right > vw + 1 || r.left < -1) {
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const pc = getComputedStyle(p);
        if (/(hidden|clip|auto|scroll)/.test(pc.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= vw + 1 && pr.left >= -1) { clipped = true; break; } }
      }
      if (!clipped) offenders.push((el.tagName.toLowerCase() + "." + String(el.className).split(" ").slice(0, 4).join(".")).slice(0, 90) + " [" + Math.round(r.left) + "," + Math.round(r.right) + "]");
    }
  }
  const nav = document.querySelector('nav[aria-label]');
  const nr = nav?.getBoundingClientRect();
  const main = document.querySelector("main");
  const mr = main?.firstElementChild?.getBoundingClientRect() ?? main?.getBoundingClientRect();
  const frame = [...document.querySelectorAll("div")].some((d) => /rounded-\\[28px\\]/.test(d.className) && getComputedStyle(d).borderTopLeftRadius === "28px");
  const dialog = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
  return { path: location.pathname + location.search, vw, overflow, offenders: offenders.slice(0, 6), nav: nr ? { left: Math.round(nr.left), width: Math.round(nr.width), bottom: Math.round(innerHeight - nr.bottom) } : null, content: mr ? { left: Math.round(mr.left), width: Math.round(mr.width) } : null, phoneFrame: frame, dialog: dialog ? { width: Math.round(dialog.width), height: Math.round(dialog.height), top: Math.round(dialog.top), fits: dialog.top >= 0 && dialog.bottom <= innerHeight && dialog.left >= 0 && dialog.right <= innerWidth } : null, docHeight: document.documentElement.scrollHeight, vh: innerHeight };
})()`;

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Network.enable", {}, sessionId);
await send(
  "Network.setBlockedURLs",
  { urls: ["*supabase.co*", "*lovable.app*", "*fairvital*", "*googleapis*", "*gstatic*"] },
  sessionId,
);
await send("Page.addScriptToEvaluateOnNewDocument", { source: seed }, sessionId);
const results = [];
const shots = (process.env.SHOTS ?? "").split(",").filter(Boolean);
for (const vp of viewports) {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);
  for (const page of pages) {
    const [path, action] = page.split("#");
    await send("Page.navigate", { url: `http://127.0.0.1:4173${path}` }, sessionId);
    await new Promise((r) => setTimeout(r, 1800));
    if (action === "dialog") {
      await send(
        "Runtime.evaluate",
        { expression: "document.querySelector('main section button, main button')?.click()" },
        sessionId,
      );
      await new Promise((r) => setTimeout(r, 700));
    }
    const { result } = await send(
      "Runtime.evaluate",
      { expression: measure, returnByValue: true },
      sessionId,
    );
    results.push({ viewport: vp.name, ...result.value });
    const key = `${vp.name}${page.replace(/[/?=#]/g, "_")}`;
    if (shots.includes(key) || shots.includes("all")) {
      const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
      writeFileSync(join(outDir, `${label}-${key}.png`), Buffer.from(data, "base64"));
    }
  }
}
writeFileSync(join(outDir, `${label}.json`), JSON.stringify(results, null, 2));
for (const r of results)
  console.log(
    `${r.viewport.padEnd(22)} ${r.path.padEnd(22)} overflow=${String(r.overflow).padStart(4)} frame=${r.phoneFrame ? "Y" : "-"} content=${r.content ? r.content.left + "+" + r.content.width : "-"} nav=${r.nav ? r.nav.left + "+" + r.nav.width : "-"}${r.dialog ? " dialog=" + r.dialog.width + "x" + r.dialog.height + (r.dialog.fits ? " fits" : " CLIPPED") : ""}${r.offenders.length ? "  OFF: " + r.offenders.join(" | ") : ""}`,
  );
ws.close();
chrome.kill();
server.close();
const failures = results.filter(
  (r) => r.overflow > 0 || r.offenders.length || r.phoneFrame || (r.dialog && !r.dialog.fits),
);
console.log(
  failures.length
    ? `FAILED: ${failures.length} screen(s)`
    : `OK: ${results.length} screens, no overflow, no phone frame, dialogs fit`,
);
process.exit(failures.length ? 1 : 0);
