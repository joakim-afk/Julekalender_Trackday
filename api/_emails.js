// E-postmaler. Endre tekstene her.
import { esc, prizeText, drawText, SITE_URL, GIFTCARD_URL, unsubUrl } from "./_lib.js";

const LOGO = process.env.EMAIL_LOGO_URL ||
  "https://www.trackday.no/static/version1790664050/frontend/Trackday/ultimo_child/nb_NO/images/logo.png";

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

export function entryEmail({ door, name }) {
  const hi = name ? `Hei ${esc(name)}!` : "Hei!";
  const when = drawText(door);
  const next = door < 24
    ? "En ny luke åpner hver natt kl. 00:00, så kom gjerne tilbake i morgen for en ny sjanse."
    : "Dette var siste luke. Takk for at du var med, og god jul!";
  const subject = `Du er med i trekningen for luke ${door}`;
  return {
    subject,
    html: layout({
      preheader: `Universalgavekort på ${prizeText(door)}. Vinneren trekkes ${when}.`,
      title: subject,
      body: `<p>${hi}</p>
<p>Du er med i trekningen av et <b>universalgavekort på ${esc(prizeText(door))}</b> bak luke ${door}.
Vinneren trekkes <b>${when}</b> og får beskjed på denne e-postadressen.</p>
<p>${next}</p>`,
      button: { label: "Til kalenderen", href: SITE_URL }
    }),
    text: `${hi}\n\nDu er med i trekningen av et universalgavekort på ${prizeText(door)} bak luke ${door}. ` +
          `Vinneren trekkes ${when} og får beskjed på denne e-postadressen.\n\n${next}\n\n${SITE_URL}`
  };
}

export function notifyEmail({ email }) {
  const subject = "Du får beskjed når lukene åpner";
  return {
    subject,
    html: layout({
      preheader: "24 luker, 24 universalgavekort. Første luke åpner 1. desember.",
      title: "Du står på startstreken!",
      body: `<p>Takk! Vi sender deg en e-post når nye luker åpner i Trackday Julekalender, så du ikke går glipp av en eneste sjanse.</p>
<p>Første luke åpner <b>1. desember kl. 00:00</b>.</p>`,
      button: { label: "Se kalenderen", href: SITE_URL },
      footer: unsubFooter(email)
    }),
    text: `Takk! Vi sender deg en e-post når nye luker åpner i Trackday Julekalender. Første luke åpner 1. desember kl. 00:00.\n\n${SITE_URL}\n\nMeld deg av: {{unsub}}`
  };
}

export function reminderEmail({ door, email }) {
  const subject = door === 24 ? "Siste luke er åpen: gavekort på " + prizeText(24) : `Luke ${door} er åpen: gavekort på ${prizeText(door)}`;
  return {
    subject,
    html: layout({
      preheader: `Bli med i trekningen i dag. Luka stenger kl. 23:59.`,
      title: `Luke ${door} er åpen`,
      body: `<p>Bak dagens luke ligger et <b>universalgavekort på ${esc(prizeText(door))}</b>.
Luka er åpen til kl. 23:59 i kveld, og vinneren trekkes ${drawText(door)}.</p>`,
      button: { label: `Åpne luke ${door}`, href: `${SITE_URL}/?utm_source=julekalender&utm_medium=email&utm_campaign=paaminnelse&utm_content=luke${door}` },
      footer: unsubFooter(email)
    }),
    text: `Luke ${door} er åpen! Bak dagens luke ligger et universalgavekort på ${prizeText(door)}. ` +
          `Luka er åpen til kl. 23:59 i kveld.\n\n${SITE_URL}\n\nMeld deg av påminnelsene: {{unsub}}`
  };
}

export function winnerEmail({ door, name }) {
  const subject = `Gratulerer! Du vant luke ${door} i Trackday Julekalender`;
  return {
    subject,
    html: layout({
      preheader: `Du vant et universalgavekort på ${prizeText(door)}.`,
      title: "Gratulerer, du vant!",
      body: `<p>${name ? `Hei ${esc(name)}! ` : ""}Du er trukket ut som vinner av luke ${door} og har vunnet et
<b>universalgavekort på ${esc(prizeText(door))}</b>.</p>
<p>Vi sender gavekortet til denne e-postadressen i løpet av kort tid. Gavekortet gjelder i 365 dager.</p>`,
      button: { label: "Se hva du kan bruke det på", href: GIFTCARD_URL }
    }),
    text: `Gratulerer! Du er trukket ut som vinner av luke ${door} og har vunnet et universalgavekort på ${prizeText(door)}. ` +
          `Vi sender gavekortet til denne e-postadressen i løpet av kort tid.`
  };
}

export function adminDrawEmail(results) {
  const rows = results.map(r => r.winner
    ? `<tr><td style="padding:6px 10px">Luke ${r.door}</td><td style="padding:6px 10px">${esc(prizeText(r.door))}</td><td style="padding:6px 10px"><b>${esc(r.winner.email)}</b>${r.winner.display_name ? " (" + esc(r.winner.display_name) + ")" : ""}</td><td style="padding:6px 10px">${r.winner.entries ?? ""} påmeldte</td></tr>`
    : `<tr><td style="padding:6px 10px">Luke ${r.door}</td><td style="padding:6px 10px">${esc(prizeText(r.door))}</td><td colspan="2" style="padding:6px 10px">Ingen påmeldinger, ingen vinner trukket</td></tr>`).join("");
  const plain = results.map(r => `Luke ${r.door} (${prizeText(r.door)}): ` +
    (r.winner ? `${r.winner.email}${r.winner.display_name ? " (" + r.winner.display_name + ")" : ""}, ${r.winner.entries ?? "?"} påmeldte` : "ingen påmeldinger")).join("\n");
  return {
    subject: `Julekalender: vinner trukket for ${results.map(r => "luke " + r.door).join(", ")}`,
    html: layout({
      preheader: "Ny vinner er trukket.",
      title: "Vinner trukket",
      body: `<table style="border-collapse:collapse;color:#f2f2f2;font-size:14px">${rows}</table>
<p>Neste steg: send gavekortet til vinneren. Navnet som vises på vinnersiden kan endres i Supabase (tabellen <i>winners</i>, kolonnene display_name og place).</p>`
    }),
    text: plain + "\n\nSend gavekortet til vinneren. Navnet på vinnersiden endres i Supabase, tabellen winners."
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
