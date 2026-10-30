// Tar imot påmeldinger fra kalenderen (type "entry") og «Varsle meg» (type "notify"),
// lagrer dem i Supabase og sender bekreftelse på e-post med en gang.
import { db, sendEmail, readBody, emailOk, todayDoor, requireEnv, flag, listUnsub, getPrize } from "./_lib.js";
import { entryEmail, notifyEmail, withUnsub } from "./_emails.js";

const GRACE_MS = 5 * 60 * 1000; // godtar gårsdagens luke i 5 minutter etter midnatt
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ttclid", "ScCid"];
const clip = (v, n) => typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null;

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });

  try {
    requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_FROM");
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ ok: false, error: "config" });
  }

  const b = readBody(req);
  const email = String(b.email || "").trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ ok: false, error: "email" });
  if (b.consent !== true) return res.status(400).json({ ok: false, error: "consent" });

  const utm = Object.fromEntries(UTM_KEYS.filter(k => typeof b[k] === "string").map(k => [k, b[k].slice(0, 200)]));
  const consentText = clip(b.consent_text, 500) || "";

  try {
    if (b.type === "notify") {
      const rows = await db("subscribers?on_conflict=email", {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=representation",
        body: { email, consent_text: consentText, utm: Object.keys(utm).length ? utm : null }
      });
      // Ny påmelding får bekreftelse. Finnes e-posten fra før, sendes ingenting på nytt.
      if (rows.length) {
        const mail = withUnsub(notifyEmail({ email }), email);
        await trySend({ to: email, ...mail, headers: listUnsub(email) });
      }
      return res.status(200).json({ ok: true });
    }

    const door = Number(b.door);
    if (!Number.isInteger(door) || door < 1 || door > 24) return res.status(400).json({ ok: false, error: "door" });
    const open = flag("ALLOW_ANY_DOOR") || door === todayDoor() || door === todayDoor(new Date(Date.now() - GRACE_MS));
    if (!open) return res.status(409).json({ ok: false, error: "closed" });

    const name = clip(b.name, 40);
    const rows = await db("entries?on_conflict=door,email", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: {
        door, email, name, consent: true, consent_text: consentText,
        utm: Object.keys(utm).length ? utm : null,
        referrer: clip(b.referrer, 500), page: clip(b.page, 500)
      }
    });
    if (rows.length) await trySend({ to: email, ...entryEmail({ door, name, p: await getPrize(door) }) });
    return res.status(200).json({ ok: true, duplicate: !rows.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "server" });
  }
}


// Påmeldingen er lagret selv om e-posten skulle feile, så brukeren får ikke feilmelding av den grunn
async function trySend(msg) {
  try { await sendEmail(msg); } catch (e) { console.error("E-post feilet:", e.message); }
}
