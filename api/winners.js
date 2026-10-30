// Vinnerlista som CSV (luke,navn,sted), i samme format som kalenderen leser fra Google Sheets.
// Viser aldri e-postadresser.
import { db } from "./_lib.js";

const cell = v => String(v ?? "").replace(/[,;\r\n"]/g, " ").trim();

export default async function handler(req, res) {
  let rows = [];
  try {
    rows = await db("winners?select=door,display_name,place&published=eq.true&order=door");
  } catch (e) {
    console.error(e);
  }
  const csv = ["luke,navn,sted", ...rows.map(r => [r.door, cell(r.display_name) || "Vinner trukket", cell(r.place)].join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.status(200).send(csv);
}
