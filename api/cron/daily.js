// Kjøres av Vercel Cron hver morgen kl. 07:00 norsk tid (se vercel.json).
// 1. Trekker vinner for alle luker som skal trekkes i dag eller tidligere og ikke er trukket ennå.
// 2. Sender e-post med vinneren til ADMIN_EMAIL (og til vinneren hvis NOTIFY_WINNER=true).
// 3. Sender påminnelse om dagens luke til alle som har trykket «Varsle meg» (hvis SEND_REMINDERS=true).
// Trygg å kjøre flere ganger: ingen luke trekkes to ganger og ingen påminnelse sendes to ganger.
import { db, sendEmail, sendBatch, osloDate, drawDay, requireEnv, flag, cronAuthorized, YEAR, listUnsub } from "../_lib.js";
import { adminDrawEmail, winnerEmail, reminderEmail, withUnsub } from "../_emails.js";

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (!cronAuthorized(req)) return res.status(401).json({ ok: false });
  try {
    requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_FROM");
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }

  // ?dag=5 simulerer 5. desember (kun for testing, krever samme hemmelighet). Sender ikke påminnelser.
  const t = osloDate();
  const fake = parseInt(req.query?.dag);
  const day = !isNaN(fake) ? fake
    : t.y < YEAR || (t.y === YEAR && t.m < 12) ? 0   // før desember
    : t.y === YEAR ? t.d                              // desember
    : 99;                                             // etter jul: trekk det som eventuelt gjenstår
  const log = { day };

  try {
    log.draws = await drawDue(day);
    if (flag("SEND_REMINDERS") && isNaN(fake) && day >= 1 && day <= 24) log.reminder = await sendReminder(day);
    console.log(JSON.stringify(log));
    return res.status(200).json({ ok: true, ...log });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message, ...log });
  }
}

async function drawDue(day) {
  if (day < 2) return [];
  const existing = new Set((await db("winners?select=door")).map(r => r.door));
  const due = [];
  for (let door = 1; door <= 24; door++) if (drawDay(door) <= day && !existing.has(door)) due.push(door);

  const results = [];
  for (const door of due) {
    const w = await db("rpc/draw_winner", {
      method: "POST",
      body: { p_door: door, p_exclude_previous: !flag("ALLOW_REPEAT_WINNERS") }
    });
    const winner = w && w.door ? w : null;
    results.push({ door, winner });
    if (winner && flag("NOTIFY_WINNER")) {
      await sendEmail({ to: winner.email, ...winnerEmail({ door, name: winner.display_name }) });
    }
  }

  const admins = (process.env.ADMIN_EMAIL || "").split(",").map(s => s.trim()).filter(Boolean);
  // Luker uten påmeldinger prøves igjen neste dag, men varsles bare på selve trekningsdagen
  const report = results.filter(r => r.winner || drawDay(r.door) === day);
  if (report.length && admins.length) await sendEmail({ to: admins, ...adminDrawEmail(report) });
  return results.map(r => ({ door: r.door, drawn: !!r.winner, entries: r.winner?.entries ?? 0 }));
}

async function sendReminder(door) {
  // Reserver dagens påminnelse først, så en ny kjøring ikke sender den igjen
  const claimed = await db("reminders?on_conflict=door", {
    method: "POST", prefer: "resolution=ignore-duplicates,return=representation", body: { door }
  });
  if (!claimed.length) return { skipped: "allerede sendt" };

  const emails = [];
  for (let from = 0; ; from += 1000) {
    const page = await db(`subscribers?select=email&unsubscribed_at=is.null&order=email&limit=1000&offset=${from}`);
    emails.push(...page.map(r => r.email));
    if (page.length < 1000) break;
  }

  const sent = await sendBatch(emails.map(email => ({
    to: email, ...withUnsub(reminderEmail({ door, email }), email), headers: listUnsub(email)
  })));
  await db(`reminders?door=eq.${door}`, { method: "PATCH", body: { sent } });
  return { sent };
}
