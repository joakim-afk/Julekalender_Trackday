// Premienavn, beskrivelse og verdi per luke til kalenderen. Gavekortkodene sendes aldri herfra.
import { db } from "./_lib.js";

export default async function handler(req, res) {
  let rows = [];
  try {
    rows = await db("prizes?select=door,title,description,value,image_url,link_url&order=door");
  } catch (e) {
    // Før bilde-kolonnene er lagt til i databasen: hent resten
    console.error(e);
    try { rows = await db("prizes?select=door,title,description,value&order=door"); } catch (e2) { console.error(e2); }
  }
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json(rows);
}
