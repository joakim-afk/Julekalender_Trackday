// Premienavn, beskrivelse og verdi per luke til kalenderen. Gavekortkodene sendes aldri herfra.
import { db } from "./_lib.js";

export default async function handler(req, res) {
  let rows = [];
  try {
    rows = await db("prizes?select=door,title,description,value&order=door");
  } catch (e) {
    console.error(e);
  }
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json(rows);
}
