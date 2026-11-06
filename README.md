# Lounge Veličkovski — sajt

Statički sajt (HTML + Tailwind v4 + vanilla JS), objavljuje se na Netlify-ju iz `dist/` (`npm run build`).

## Mejl o novom zahtevu (Resend)

Svaki zahtev iz forme „zakazivanje“ Netlify čuva u Netlify Forms, a funkcija
`netlify/functions/submission-created.mjs` dodatno šalje mejl salonu (`loungevelickovski@gmail.com`)
preko [Resend](https://resend.com) API-ja.

- **Env promenljiva:** `RESEND_API_KEY` — Resend API ključ. Podešava se u Netlify-ju:
  *Site configuration → Environment variables* (ključ se nikad ne upisuje u repo).
- **Env promenljiva (opciono):** `NOTIFY_EMAIL` — adresa na koju stiže mejl. Ako ne postoji ili je prazna,
  koristi se `loungevelickovski@gmail.com`. U Netlify-ju se podešava **posebno po deploy kontekstu**
  (*Environment variables → Add a variable → Different value for each deploy context*):
  za **Deploy Previews** neka bude test adresa, a za **Production** salonska adresa ili prazno.
- **Domen:** `loungevelickovski.com` mora biti verifikovan u Resend-u (*Domains*, DNS zapisi), jer se
  šalje sa `zakazivanje@loungevelickovski.com`.
- Ako ključ nedostaje ili Resend vrati grešku, greška se upisuje u log funkcije (Netlify → *Logs → Functions*),
  a zahtev ostaje sačuvan u Netlify Forms.
- Test: `node scripts/test-submission-created.mjs`
