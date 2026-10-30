// Felles innstillinger og hjelpefunksjoner. Filer som starter med _ blir ikke egne API-ruter i Vercel.
import { createHmac } from "node:crypto";

export const YEAR = Number(process.env.CAMPAIGN_YEAR || 2026);
export const LAST_DRAW_DAY = Number(process.env.LAST_DRAW_DAY || 27);
export const SITE_URL = (process.env.SITE_URL || "https://julekalender.trackday.no").replace(/\/$/, "");
export const GIFTCARD_URL = process.env.GIFTCARD_URL || "https://www.trackday.no/supertilbud.html";

// Må stemme med CONFIG.prizes i index.html
export const PRIZES = [500,1000,500,1500,1000,2000,500,1000,2500,1000,1500,3000,
                       500,1000,2000,1500,2500,1000,3000,2000,1500,5000,2500,10000];

export const prizeText = n => {
  const p = PRIZES[n - 1];
  return typeof p === "number" ? `${p.toLocaleString("nb-NO").replace(/\s/g, " ")} kr` : String(p);
};

export const flag = name => ["1", "true", "yes", "ja"].includes(String(process.env[name] || "").toLowerCase());

export function requireEnv(...names) {
  const missing = names.filter(n => !process.env[n]);
  if (missing.length) throw new Error("Mangler miljøvariabler: " + missing.join(", "));
}

/* ---------- Norsk tid ---------- */
export function osloDate(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false
  }).formatToParts(date).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}

// 0 = før start, 1-24 = dagens luke, 25 = ferdig (samme regel som i index.html)
export function todayDoor(date = new Date()) {
  const t = osloDate(date);
  if (t.y < YEAR || (t.y === YEAR && t.m < 12)) return 0;
  if (t.y > YEAR || t.d > 24) return 25;
  return t.d;
}

// Hvilken dato (dag i desember) en luke trekkes
export const drawDay = door => door === 24 ? LAST_DRAW_DAY : door + 1;

export const drawText = door => `${drawDay(door)}. desember`;

/* ---------- Supabase (REST, ingen pakker nødvendig) ---------- */
export async function db(path, { method = "GET", body, prefer } = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "") + "/rest/v1/" + path;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Gamle service_role-nøkler (JWT, starter med eyJ) må også sendes som Bearer. Nye sb_secret_-nøkler holder med apikey.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/* ---------- E-post via Resend ---------- */
function message({ to, subject, html, text, headers }) {
  const m = { from: process.env.EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html, text };
  if (process.env.EMAIL_REPLY_TO) m.reply_to = process.env.EMAIL_REPLY_TO;
  if (headers) m.headers = headers;
  return m;
}

async function resend(path, payload) {
  const res = await fetch("https://api.resend.com" + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

export const sendEmail = msg => resend("/emails", message(msg));

// Inntil 100 e-poster per kall. Resend tillater som standard 2 kall i sekundet.
export async function sendBatch(msgs) {
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 100) {
    if (i) await new Promise(r => setTimeout(r, 600));
    await resend("/emails/batch", msgs.slice(i, i + 100).map(message));
    sent += Math.min(100, msgs.length - i);
  }
  return sent;
}

/* ---------- Avmelding ---------- */
const unsubSecret = () => process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const unsubToken = email => createHmac("sha256", unsubSecret()).update(email).digest("hex").slice(0, 32);
export const unsubUrl = email => `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
export const listUnsub = email => ({
  "List-Unsubscribe": `<${unsubUrl(email)}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
});

/* ---------- Diverse ---------- */
export const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const emailOk = v => typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.authorization === `Bearer ${secret}`;
}
