// Netlify poziva ovu funkciju sam posle svakog primljenog (ne-spam) zahteva iz Netlify Forms.
// Za formu „zakazivanje“ šalje mejl salonu preko Resend API-ja. Bez npm zavisnosti.
// Env promenljive (podešavaju se u Netlify-ju, nikad u repou):
//   RESEND_API_KEY — obavezna
//   NOTIFY_EMAIL   — primalac mejla; ako nedostaje ili je prazna, koristi se DEFAULT_NOTIFY_EMAIL

const DEFAULT_NOTIFY_EMAIL = 'loungevelickovski@gmail.com'; // koristi se kad NOTIFY_EMAIL nije podešen ili je prazan
const FROM = 'Lounge Veličkovski – zakazivanje <zakazivanje@loungevelickovski.com>';
const FORM_NAME = 'zakazivanje';

const GOLD = '#c9a56a';
const DARK = '#18120f';

const OK = { statusCode: 200, body: 'ok' }; // uvek 200: Netlify ne sme da ponavlja poziv

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const clean = (value) => String(value ?? '').replace(/\r\n?/g, '\n').trim();
const oneLine = (value) => clean(value).replace(/\s+/g, ' ');

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// Usluge stižu kao niz (više polja istog imena) ili kao jedan string.
const toList = (value) => {
  const raw = Array.isArray(value) ? value : value == null ? [] : String(value).split('\n');
  return raw.map(oneLine).filter(Boolean);
};

// dd-mm-gggg (ili dd.mm.gggg) -> dd.mm.gggg.
const formatDate = (value) => {
  const text = oneLine(value);
  const m = text.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})\.?$/);
  return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${m[3]}.` : text;
};

// Vreme prijema po beogradskom vremenu: dd.mm.gggg. u HH:MM
const formatReceived = (iso) => {
  const date = iso && !Number.isNaN(new Date(iso).getTime()) ? new Date(iso) : new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Belgrade',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return `${parts.day}.${parts.month}.${parts.year}. u ${parts.hour}:${parts.minute}`;
};

// Broj mušterije u međunarodnom obliku (samo cifre) za wa.me; null ako ne liči na broj.
const internationalDigits = (phone) => {
  let digits = String(phone ?? '').replace(/[^\d+]/g, '');
  const plus = digits.startsWith('+');
  digits = digits.replace(/\D/g, '');
  if (!plus && digits.startsWith('00')) digits = digits.slice(2);
  else if (!plus && digits.startsWith('0')) digits = `381${digits.slice(1)}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

export const buildEmail = (data, createdAt) => {
  const name = oneLine(data.ime) || 'Nepoznato ime';
  const phone = oneLine(data.telefon);
  const email = oneLine(data.email);
  const services = toList(data.usluga);
  const date = formatDate(data.datum);
  const time = oneLine(data.vreme);
  const note = clean(data.napomena);
  const received = formatReceived(createdAt);
  const intl = internationalDigits(phone);
  const validEmail = EMAIL_RE.test(email) ? email : '';

  const subject = `Novi zahtev: ${name} – ${date || 'bez datuma'}, ${time || 'bez termina'}`.replace(/[\r\n]+/g, ' ');

  const text = [
    'NOVI ZAHTEV ZA TERMIN',
    '',
    `Ime: ${name}`,
    `Telefon: ${phone || '—'}${intl ? ` (WhatsApp: https://wa.me/${intl})` : ''}`,
    `Mejl: ${email || '—'}`,
    '',
    'Usluge:',
    ...(services.length ? services.map((s) => `  - ${s}`) : ['  —']),
    '',
    `Datum: ${date || '—'}`,
    `Vreme: ${time || '—'}`,
    `Napomena: ${note || '—'}`,
    '',
    `Primljeno: ${received} (Europe/Belgrade)`,
  ].join('\n');

  const row = (label, valueHtml) =>
    `<tr><td style="padding:10px 0 2px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a7a66">${label}</td></tr>` +
    `<tr><td style="padding:0 0 10px;font-size:16px;line-height:1.5;color:#2a211b;border-bottom:1px solid #eee6da">${valueHtml}</td></tr>`;

  const phoneHtml = phone
    ? `<a href="tel:${esc(intl ? `+${intl}` : phone.replace(/[^\d+]/g, ''))}" style="color:#2a211b;font-weight:600;text-decoration:none">${esc(phone)}</a>` +
      (intl
        ? ` &nbsp;<a href="https://wa.me/${intl}" style="display:inline-block;margin-top:4px;padding:4px 12px;border-radius:999px;background:${GOLD};color:${DARK};font-size:13px;font-weight:600;text-decoration:none">WhatsApp</a>`
        : '')
    : '—';
  const emailHtml = email
    ? validEmail
      ? `<a href="mailto:${esc(email)}" style="color:#2a211b">${esc(email)}</a>`
      : esc(email)
    : '—';
  const servicesHtml = services.length ? services.map((s) => `• ${esc(s)}`).join('<br>') : '—';
  const noteHtml = note ? esc(note).replace(/\n/g, '<br>') : '—';

  const html = `<!doctype html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4efe8;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe8"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:${DARK};padding:22px 24px;border-bottom:3px solid ${GOLD}">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff">Lounge Veličkovski</div>
<div style="margin-top:4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${GOLD}">Novi zahtev za termin</div>
</td></tr>
<tr><td style="padding:12px 24px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Ime', `<strong>${esc(name)}</strong>`)}
${row('Telefon', phoneHtml)}
${row('Mejl', emailHtml)}
${row('Usluge', servicesHtml)}
${row('Datum', esc(date) || '—')}
${row('Vreme', esc(time) || '—')}
${row('Napomena', noteHtml)}
</table></td></tr>
<tr><td style="padding:14px 24px;background:#faf6ef;font-size:12px;color:#8a7a66">Primljeno: ${esc(received)} (Europe/Belgrade)</td></tr>
</table></td></tr></table>
</body></html>`;

  return { subject, html, text, replyTo: validEmail };
};

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event?.body || '{}').payload;
  } catch {
    console.error('[submission-created] Neispravan JSON u telu zahteva.');
    return OK;
  }
  if (!payload || payload.form_name !== FORM_NAME) return OK; // druge forme se ignorišu

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[submission-created] RESEND_API_KEY nije podešen — mejl nije poslat (zahtev je sačuvan u Netlify Forms).');
    return OK;
  }

  try {
    const { subject, html, text, replyTo } = buildEmail(payload.data || {}, payload.created_at);
    const body = { from: FROM, to: [process.env.NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL], subject, html, text };
    if (replyTo) body.reply_to = replyTo;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let message = '';
      try {
        const err = await res.json();
        message = err?.message || err?.name || JSON.stringify(err);
      } catch {
        message = 'bez tela odgovora';
      }
      console.error(`[submission-created] Resend greška: status ${res.status}: ${String(message).slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`[submission-created] Slanje nije uspelo: ${String(err?.message || err).slice(0, 300)}`);
  }
  return OK;
};
