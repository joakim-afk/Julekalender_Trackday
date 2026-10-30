// Avmelding fra påminnelsene. Lenken står i hver påminnelse, og e-postklienter kan
// også melde av med ett klikk (POST) via List-Unsubscribe-headeren.
import { db, unsubToken, SITE_URL, esc } from "./_lib.js";
import { timingSafeEqual } from "node:crypto";

export default async function handler(req, res) {
  const email = String(req.query.e || "").toLowerCase();
  const token = String(req.query.t || "");
  const expected = email ? unsubToken(email) : "";
  const valid = token.length === expected.length && expected &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected));

  if (!valid) return page(res, 400, "Ugyldig lenke", "Lenken ser ut til å være ødelagt. Prøv å kopiere hele lenken fra e-posten.");

  try {
    await db(`subscribers?email=eq.${encodeURIComponent(email)}`, {
      method: "PATCH", body: { unsubscribed_at: new Date().toISOString() }
    });
  } catch (e) {
    console.error(e);
    return page(res, 500, "Noe gikk galt", "Vi klarte ikke å melde deg av akkurat nå. Prøv igjen om litt.");
  }
  if (req.method === "POST") return res.status(200).send("ok");
  return page(res, 200, "Du er meldt av", `${esc(email)} får ikke flere påminnelser fra julekalenderen.`);
}

function page(res, status, title, text) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(status).send(`<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0e11;color:#f2f2f2;font-family:Arial,Helvetica,sans-serif;padding:16px">
<div style="max-width:440px;text-align:center"><h1 style="font-size:24px">${title}</h1><p style="color:#c8c8c8;line-height:1.5">${text}</p>
<p><a href="${SITE_URL}" style="color:#ff5a4f">Tilbake til kalenderen</a></p></div></body></html>`);
}
