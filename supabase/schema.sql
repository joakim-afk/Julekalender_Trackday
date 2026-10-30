-- Trackday julekalender: databaseoppsett for Supabase.
-- Kjør hele filen én gang i Supabase > SQL Editor > New query > Run.
-- Tabellene har Row Level Security på uten policyer, så de kan bare leses og
-- skrives av serveren (service role-nøkkelen), aldri direkte fra nettleseren.

-- Påmeldinger til trekningen, én rad per e-post per luke
create table if not exists entries (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  door         smallint    not null check (door between 1 and 24),
  email        text        not null,
  name         text,
  consent      boolean     not null,
  consent_text text        not null,
  utm          jsonb,
  referrer     text,
  page         text,
  unique (door, email)
);
create index if not exists entries_email_idx on entries (email);

-- «Varsle meg»-påmeldinger (påminnelse når nye luker åpner)
create table if not exists subscribers (
  email           text primary key,
  created_at      timestamptz not null default now(),
  consent_text    text        not null,
  utm             jsonb,
  unsubscribed_at timestamptz
);

-- Vinnere. display_name og place vises på vinnersiden og kan endres fritt i
-- Table Editor (f.eks. «Kari N.» og «Drammen»). Sett published = false for å skjule.
create table if not exists winners (
  door         smallint primary key check (door between 1 and 24),
  entry_id     bigint      not null references entries (id),
  email        text        not null,
  display_name text,
  place        text,
  published    boolean     not null default true,
  entries      integer,
  drawn_at     timestamptz not null default now()
);

-- Logg over sendte påminnelser, så ingen får samme e-post to ganger
create table if not exists reminders (
  door     smallint primary key,
  sent_at  timestamptz not null default now(),
  sent     integer
);

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

alter table entries     enable row level security;
alter table subscribers enable row level security;
alter table winners     enable row level security;
alter table reminders   enable row level security;

-- Trekker en tilfeldig vinner for en luke. Trygg å kjøre flere ganger:
-- er luka allerede trukket, returneres den eksisterende vinneren.
-- Uten påmeldinger returneres en tom rad (door = null).
create or replace function draw_winner(p_door integer, p_exclude_previous boolean default true)
returns winners
language plpgsql
security definer
set search_path = public
as $$
declare
  w winners;
  n integer;
begin
  select * into w from winners where door = p_door;
  if found then
    return w;
  end if;

  select count(*) into n from entries where door = p_door;

  insert into winners (door, entry_id, email, display_name, entries)
  select e.door, e.id, e.email, e.name, n
  from entries e
  where e.door = p_door
    and (not p_exclude_previous or e.email not in (select email from winners))
  order by gen_random_uuid()
  limit 1
  returning * into w;

  return w;
end;
$$;

revoke execute on function draw_winner(integer, boolean) from public, anon, authenticated;

-- Alle som har sagt ja til nyhetsbrev (fra trekningen eller «Varsle meg»).
-- Eksporter som CSV til nyhetsbrevverktøyet: Table Editor > newsletter_optins > Export.
create or replace view newsletter_optins with (security_invoker = true) as
select email, min(created_at) as first_seen
from (
  select email, created_at from entries where consent
  union all
  select email, created_at from subscribers where unsubscribed_at is null
) s
where email not in (select email from subscribers where unsubscribed_at is not null)
group by email;

-- Antall påmeldinger per luke, nyttig for å følge med underveis
create or replace view entries_per_door with (security_invoker = true) as
select door, count(*) as entries, count(distinct email) as people
from entries
group by door
order by door;
