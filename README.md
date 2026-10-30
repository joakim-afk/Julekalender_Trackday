# Trackday Julekalender 2026

Julekalenderen med påmelding, bekreftelse på e-post, daglig trekning og vinnerliste.

- **Vercel** viser siden og kjører API-et og den daglige jobben.
- **Supabase** lagrer påmeldinger, «Varsle meg»-adresser og vinnere.
- **Resend** sender e-postene fra @trackday.no.

Det trengs ingen pakker eller byggesteg. Alt kobles til med nøkler, så dere kan bruke hvilke kontoer dere vil.

## Slik fungerer det

| Hva skjer | Når | Fil |
|---|---|---|
| Noen åpner dagens luke og melder seg på. Påmeldingen lagres, og bekreftelsen sendes med en gang. | Hele døgnet, bare for dagens luke (norsk tid) | `api/entry.js` |
| Noen trykker «Varsle meg». Adressen lagres, og bekreftelsen sendes med en gang. | Når som helst | `api/entry.js` |
| Gårsdagens luke trekkes, og dere får e-post med vinneren | Hver morgen kl. 07:00 | `api/cron/daily.js` |
| Påminnelse om dagens luke til «Varsle meg»-listen | Hver morgen kl. 07:00, 1.–24. des | `api/cron/daily.js` |
| Vinnersiden oppdateres automatisk | Innen ett minutt etter trekningen | `api/winners.js` |
| Avmelding fra påminnelser | Lenke i hver påminnelse | `api/unsubscribe.js` |

Luke 1–23 trekkes dagen etter. Luke 24 trekkes 27. desember (kan endres med `LAST_DRAW_DAY`).
Samme person kan som standard bare vinne én gang. Vinneren trekkes tilfeldig blant alle som har meldt seg på luka.

## Oppsett (ca. 30 minutter)

### 1. Supabase
1. Opprett et nytt prosjekt på supabase.com. **Velg region i EU** (Stockholm eller Frankfurt).
2. Gå til **SQL Editor → New query**, lim inn hele `supabase/schema.sql` og trykk **Run**.
3. Gå til **Project Settings → API** og kopier **Project URL** og **service_role**-nøkkelen (ikke anon).

### 2. Resend
1. Opprett konto på resend.com og velg et betalt abonnement (gratis stopper på 100 e-poster per dag).
2. Gå til **Domains → Add domain**, skriv `trackday.no` og velg region **eu-west-1 (Ireland)**.
3. Resend viser 3–4 DNS-poster (MX og TXT på `send.trackday.no` og en DKIM-post `resend._domainkey`). Send dem til den som styrer DNS for trackday.no. De påvirker ikke e-posten dere har i dag.
4. Når domenet står som **Verified**: gå til **API Keys → Create API key** (Sending access) og kopier nøkkelen.

### 3. Vercel
1. Legg denne mappen i et GitHub-repo, og velg **Add New → Project** i Vercel og importer repoet.
   (Alternativ uten GitHub: kjør `npx vercel --prod` i mappen.)
2. Framework Preset: **Other**. Ingen build-kommando trengs.
3. Under **Settings → Environment Variables**: legg inn alt fra `.env.example` med deres egne verdier.
   `CRON_SECRET` er bare en lang tilfeldig tekst, f.eks. fra et passordverktøy.
4. Deploy på nytt etter at variablene er lagt inn (**Deployments → … → Redeploy**).
5. Vercel må være på **Pro** fordi kampanjen er kommersiell bruk.

### 4. Domene
1. I Vercel: **Settings → Domains → Add** `julekalender.trackday.no`.
2. Legg inn CNAME-posten Vercel viser for `julekalender` hos DNS-leverandøren.
   HTTPS ordnes automatisk.

## Testing før 1. desember

1. Sett `ALLOW_ANY_DOOR=true` i Vercel og redeploy.
2. Åpne `https://julekalender.trackday.no/?preview`. Da kan alle luker åpnes. Meld deg på et par luker med din egen e-post, og sjekk at bekreftelsen kommer.
3. Test trekningen ved å kalle jobben med en tenkt dato (her 3. desember, som trekker luke 1 og 2):
   ```
   https://julekalender.trackday.no/api/cron/daily?dag=3&key=<CRON_SECRET>
   ```
   Sjekk at dere får vinner-e-posten, og at vinneren vises på `/#vinnere`.
4. **Før lansering:** sett `ALLOW_ANY_DOOR=false`, redeploy, og kjør `supabase/reset-etter-test.sql` i SQL Editor for å slette testdataene.

Tips: `?dag=12` i nettleseren viser hvordan kalenderen ser ut 12. desember (bare visning, påmeldinger følger ekte dato).

## Underveis i kampanjen

- **Følge med:** Supabase → Table Editor → `entries_per_door` viser antall påmeldinger per luke.
- **Vinnernavn:** Vinnersiden viser fornavnet personen skrev inn. Endre det i tabellen `winners` (kolonnene `display_name` og `place`, f.eks. «Kari N.» og «Drammen»). Sett `published` til false for å skjule en vinner.
- **Trekke på nytt** (f.eks. hvis vinneren ikke svarer): slett raden for luka i `winners`, og åpne adressen over uten `dag=3&` (altså bare `?key=<CRON_SECRET>`).
- **Nyhetsbrev:** `newsletter_optins` er alle som har sagt ja til nyhetsbrev. Eksporter som CSV og importer i nyhetsbrevverktøyet.
- **Feil:** Vercel → Project → Logs viser alt API-et og jobben gjør.

## Innstillinger (miljøvariabler)

| Variabel | Forklaring |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Fra Supabase → Project Settings → API |
| `RESEND_API_KEY` | Fra Resend → API Keys |
| `EMAIL_FROM` | Avsender, f.eks. `Trackday Julekalender <julekalender@trackday.no>` |
| `EMAIL_REPLY_TO` | Valgfritt. Hvor svar på e-postene havner |
| `ADMIN_EMAIL` | Får e-post med vinneren hver morgen. Flere skilles med komma |
| `CRON_SECRET` | Lang tilfeldig tekst som beskytter den daglige jobben |
| `SITE_URL` | `https://julekalender.trackday.no` |
| `SEND_REMINDERS` | `true` sender daglig påminnelse til «Varsle meg»-listen |
| `NOTIFY_WINNER` | `true` sender «Gratulerer»-e-post til vinneren automatisk. `false` betyr at dere kontakter vinneren selv |
| `ALLOW_REPEAT_WINNERS` | `true` lar samme person vinne flere luker |
| `ALLOW_ANY_DOOR` | `true` lar alle luker ta imot påmeldinger. **Kun for testing** |
| `LAST_DRAW_DAY` | Datoen i desember luke 24 trekkes. Standard 27 |

Tekstene i e-postene endres i `api/_emails.js`. Premiene står både i `index.html` (`CONFIG.prizes`) og `api/_lib.js` (`PRIZES`), og de må være like.
