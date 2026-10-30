// E-postmaler. Endre tekstene her.
import { esc, prizeText, PRIZES, kr, drawText, SITE_URL, GIFTCARD_URL, unsubUrl } from "./_lib.js";

const LOGO = process.env.EMAIL_LOGO_URL ||
  "https://www.trackday.no/static/version1790664050/frontend/Trackday/ultimo_child/nb_NO/images/logo.png";

// Premien fra arket («Lamborghini, 3 runder (verdi 2 500 kr)»), ellers «en kjøreopplevelse verdt 500 kr»
const prize = (door, p) => p?.title ? `${p.title}${p.value ? ` (verdi ${kr(p.value)})` : ""}`
  : typeof PRIZES[door - 1] === "number" ? `en kjøreopplevelse verdt ${prizeText(door)}` : prizeText(door);

function layout({ preheader, title, body, button, footer = "" }) {
  return `<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#0d0e11;font-family:Arial,Helvetica,sans-serif;color:#f2f2f2">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0e11"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#16181d;border-radius:16px;overflow:hidden">
<tr><td style="height:8px;background:repeating-linear-gradient(90deg,#fff 0 12px,#111 12px 24px)"></td></tr>
<tr><td style="padding:28px 28px 8px"><img src="${LOGO}" alt="Trackday" height="34" style="display:block;height:34px"></td></tr>
<tr><td style="padding:8px 28px 4px"><h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#fff">${esc(title)}</h1>
<div style="font-size:16px;line-height:1.55;color:#d6d6d6">${body}</div></td></tr>
${button ? `<tr><td style="padding:20px 28px 8px"><a href="${button.href}" style="display:inline-block;background:#e10600;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px">${esc(button.label)}</a></td></tr>` : ""}
<tr><td style="padding:24px 28px 28px;font-size:12px;line-height:1.5;color:#8a8f99">Trackday Julekalender · <a href="${SITE_URL}" style="color:#8a8f99">${SITE_URL.replace(/^https?:\/\//, "")}</a>${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function entryEmail({ door, name, p }) {
  const hi = name ? `Hei ${esc(name)}!` : "Hei!";
  const when = drawText(door);
  const next = door < 24
    ? "En ny luke åpner hver natt kl. 00:00, så kom gjerne tilbake i morgen for en ny sjanse."
    : "Dette var siste luke. Takk for at du var med, og god jul!";
  const subject = `Du er med i trekningen for luke ${door}`;
  return {
    subject,
    html: layout({
      preheader: `Vinn ${prize(door, p)}. Vinneren trekkes ${when}.`,
      title: subject,
      body: `<p>${hi}</p>
<p>Du er med i trekningen av <b>${esc(prize(door, p))}</b> bak luke ${door}.
Vinneren trekkes <b>${when}</b> og får beskjed på denne e-postadressen.</p>
<p>${next}</p>`,
      button: { label: "Til kalenderen", href: SITE_URL }
    }),
    text: `${hi}\n\nDu er med i trekningen av ${prize(door, p)} bak luke ${door}. ` +
          `Vinneren trekkes ${when} og får beskjed på denne e-postadressen.\n\n${next}\n\n${SITE_URL}`
  };
}

export function notifyEmail({ email }) {
  const subject = "Du får beskjed når lukene åpner";
  return {
    subject,
    html: layout({
      preheader: "24 luker, 24 gavekort på kjøreopplevelser. Første luke åpner 1. desember.",
      title: "Du står på startstreken!",
      body: `<p>Takk! Vi sender deg en e-post når nye luker åpner i Trackday Julekalender, så du ikke går glipp av en eneste sjanse.</p>
<p>Første luke åpner <b>1. desember kl. 00:00</b>.</p>`,
      button: { label: "Se kalenderen", href: SITE_URL },
      footer: unsubFooter(email)
    }),
    text: `Takk! Vi sender deg en e-post når nye luker åpner i Trackday Julekalender. Første luke åpner 1. desember kl. 00:00.\n\n${SITE_URL}\n\nMeld deg av: {{unsub}}`
  };
}

export function reminderEmail({ door, email, p }) {
  const subject = `${door === 24 ? "Siste luke" : `Luke ${door}`} er åpen: vinn ${prize(door, p)}`;
  return {
    subject,
    html: layout({
      preheader: `Bli med i trekningen i dag. Luka stenger kl. 23:59.`,
      title: `Luke ${door} er åpen`,
      body: `<p>Bak dagens luke ligger <b>${esc(prize(door, p))}</b>.
Luka er åpen til kl. 23:59 i kveld, og vinneren trekkes ${drawText(door)}.</p>`,
      button: { label: `Åpne luke ${door}`, href: `${SITE_URL}/?utm_source=julekalender&utm_medium=email&utm_campaign=paaminnelse&utm_content=luke${door}` },
      footer: unsubFooter(email)
    }),
    text: `Luke ${door} er åpen! Bak dagens luke ligger ${prize(door, p)}. ` +
          `Luka er åpen til kl. 23:59 i kveld.\n\n${SITE_URL}\n\nMeld deg av påminnelsene: {{unsub}}`
  };
}

export function winnerEmail({ door, name, p }) {
  const subject = `Gratulerer! Du vant luke ${door} i Trackday Julekalender`;
  const hi = name ? `Hei ${esc(name)}! ` : "";
  const code = p?.code;
  const details = code ? [
    ["Gavekortkode", code],
    p.valid_until && ["Gyldig til", p.valid_until],
    p.redeem_url && ["Løs inn her", p.redeem_url]
  ].filter(Boolean) : [];
  const box = details.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#0d0e11;border:1px solid #f5c542;border-radius:12px;width:100%">
${details.map(([k, v]) => `<tr><td style="padding:10px 14px;color:#8a8f99;font-size:13px;white-space:nowrap">${k}</td><td style="padding:10px 14px;font-size:${k === "Gavekortkode" ? 20 : 15}px;font-weight:bold;color:#fff;font-family:${k === "Gavekortkode" ? "Courier New,monospace" : "Arial,sans-serif"}">${k === "Løs inn her" ? `<a href="${esc(v)}" style="color:#ff5a4f">${esc(v)}</a>` : esc(v)}</td></tr>`).join("")}
</table>` : "";
  const after = code
    ? "Ta vare på koden. Den er personlig og kan bare brukes én gang."
    : "Vi sender gavekortet til denne e-postadressen i løpet av kort tid.";
  return {
    subject,
    html: layout({
      preheader: `Du vant ${prize(door, p)}.`,
      title: "Gratulerer, du vant!",
      body: `<p>${hi}Du er trukket ut som vinner av luke ${door} i Trackday Julekalender og har vunnet et gavekort på
<b>${esc(prize(door, p))}</b>.</p>${p?.description ? `<p>${esc(p.description)}</p>` : ""}
${box}<p>${after}</p>`,
      button: p?.redeem_url && code ? { label: "Løs inn gavekortet", href: p.redeem_url } : { label: "Se kjøreopplevelsene", href: GIFTCARD_URL }
    }),
    text: `Gratulerer! Du er trukket ut som vinner av luke ${door} og har vunnet et gavekort på ${prize(door, p)}.\n\n` +
          details.map(([k, v]) => `${k}: ${v}`).join("\n") + (details.length ? "\n\n" : "") + after
  };
}

export function adminDrawEmail(results) {
  const td = v => `<td style="padding:6px 10px;vertical-align:top">${v}</td>`;
  const status = r => r.sent ? "Gavekortkoden er sendt til vinneren automatisk."
    : r.reason || "Send gavekortet til vinneren manuelt.";
  const rows = results.map(r => `<tr>${td(`Luke ${r.door}`)}${td(esc(prize(r.door, r.prize)))}${r.winner
    ? td(`<b>${esc(r.winner.email)}</b>${r.winner.display_name ? " (" + esc(r.winner.display_name) + ")" : ""}<br>${r.winner.entries ?? "?"} påmeldte`) + td(esc(status(r)))
    : `<td colspan="2" style="padding:6px 10px">Ingen påmeldinger, ingen vinner trukket</td>`}</tr>`).join("");
  const plain = results.map(r => `Luke ${r.door} (${prize(r.door, r.prize)}): ` +
    (r.winner ? `${r.winner.email}${r.winner.display_name ? " (" + r.winner.display_name + ")" : ""}, ${r.winner.entries ?? "?"} påmeldte. ${status(r)}` : "ingen påmeldinger")).join("\n");
  const note = "Navnet som vises på vinnersiden kan endres i Supabase (tabellen winners, kolonnene display_name og place).";
  return {
    subject: `Julekalender: vinner trukket for ${results.map(r => "luke " + r.door).join(", ")}`,
    html: layout({
      preheader: "Ny vinner er trukket.",
      title: "Vinner trukket",
      body: `<table style="border-collapse:collapse;color:#f2f2f2;font-size:14px">${rows}</table><p>${note}</p>`
    }),
    text: plain + "\n\n" + note
  };
}

function unsubFooter(email) {
  return email ? `<br>Du får denne e-posten fordi du ba om varsel fra julekalenderen. <a href="{{unsub}}" style="color:#8a8f99">Meld deg av</a>.` : "";
}

// Setter inn avmeldingslenken der malen har {{unsub}}
export const withUnsub = (mail, email) => ({
  ...mail,
  html: mail.html.replaceAll("{{unsub}}", unsubUrl(email)),
  text: mail.text.replaceAll("{{unsub}}", unsubUrl(email))
});
