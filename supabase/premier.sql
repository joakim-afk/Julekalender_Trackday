-- Kjør én gang i Supabase > SQL Editor for å legge til premietabellen i en database som allerede er satt opp.
-- Premier og gavekortkoder, én rad per luke. Fylles fra Google-arket (se supabase/premier-import.sql).
-- Kodene leses bare av serveren og sendes kun til vinneren.
create table if not exists prizes (
  door         smallint primary key check (door between 1 and 24),
  title        text,
  description  text,
  value        integer,
  code         text,
  valid_until  text,
  redeem_url   text,
  code_sent_at timestamptz
);
alter table prizes enable row level security;

-- Bilde av bilen og lenke til opplevelsen (lagt til 1. november 2026)
alter table prizes add column if not exists image_url text;
alter table prizes add column if not exists link_url  text;
