// Test funkcije submission-created sa mock-ovanim fetch-om (bez mreže):
//   node scripts/test-submission-created.mjs
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handler } from '../netlify/functions/submission-created.mjs';

const payload = (over = {}, formName = 'zakazivanje') =>
  JSON.stringify({
    payload: {
      form_name: formName,
      created_at: '2026-03-10T12:34:00.000Z',
      data: {
        ime: 'Željka Đurđević',
        telefon: '069 212 1966',
        email: 'zeljka@primer.rs',
        usluga: ['Frizerske usluge — Šišanje', 'Nokti — Gel lak', 'Šminkanje'],
        datum: '15-03-2026',
        vreme: 'Popodne',
        napomena: 'Čekam termin, šteta što ćemo žuriti – đak.\n<script>alert("x")</script> & "navodnici"',
        ...over,
      },
    },
  });

const realFetch = globalThis.fetch;
const realError = console.error;
let calls;
let logged;
const mock = (status, json = { message: 'Mock Resend poruka' }) => {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(status < 300 ? { id: 'mock-id' } : json), { status });
  };
};
const capture = () => {
  logged = [];
  console.error = (...a) => logged.push(a.join(' '));
};
const restore = () => {
  globalThis.fetch = realFetch;
  console.error = realError;
};

try {
  process.env.RESEND_API_KEY = 'test-kljuc-nije-pravi';
  delete process.env.NOTIFY_EMAIL;

  // 1) uspešan zahtev
  mock(200);
  capture();
  let res = await handler({ body: payload() });
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-kljuc-nije-pravi');
  const body = JSON.parse(calls[0].init.body);
  const shown = { ...body, html: `(${body.html.length} znakova HTML-a, snimljeno u fajl)` };
  restore();
  console.log('--- telo zahteva ka Resend-u ---');
  console.log(JSON.stringify(shown, null, 2));
  assert.equal(body.from, 'Lounge Veličkovski – zakazivanje <zakazivanje@loungevelickovski.com>');
  assert.deepEqual(body.to, ['loungevelickovski@gmail.com']);
  assert.equal(body.reply_to, 'zeljka@primer.rs');
  assert.equal(body.subject, 'Novi zahtev: Željka Đurđević – 15.03.2026., Popodne');
  for (const s of ['Šišanje', 'Gel lak', 'Šminkanje']) assert.ok(body.text.includes(s) && body.html.includes(s));
  assert.ok(body.html.includes('č') && body.html.includes('đ') && body.html.includes('ž'));
  assert.ok(!body.html.includes('<script>'), 'HTML mora da escape-uje <script>');
  assert.ok(body.html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(body.html.includes('href="tel:+381692121966"') && body.html.includes('https://wa.me/381692121966'));
  assert.ok(body.html.includes('15.03.2026.') && body.text.includes('Primljeno: 10.03.2026. u 13:34'));
  const file = join(tmpdir(), 'submission-created-test.html');
  writeFileSync(file, body.html);
  console.log(`HTML mejla snimljen: ${file}`);
  console.log('--- tekstualna verzija ---');
  console.log(body.text);

  // 2) nevažeći mejl -> bez reply_to; ime sa HTML-om se escape-uje i u naslovu ostaje tekst
  mock(200);
  await handler({ body: payload({ email: 'nije-mejl', ime: '<b>Ana</b>' }) });
  const b2 = JSON.parse(calls[0].init.body);
  assert.equal(b2.reply_to, undefined);
  assert.ok(!b2.html.includes('<b>Ana</b>') && b2.html.includes('&lt;b&gt;Ana&lt;/b&gt;'));

  // 2b) primalac: NOTIFY_EMAIL postoji / prazan / ne postoji
  for (const [value, expected] of [
    ['test@primer.rs', 'test@primer.rs'],
    ['  test@primer.rs  ', 'test@primer.rs'],
    ['', 'loungevelickovski@gmail.com'],
    ['   ', 'loungevelickovski@gmail.com'],
    [undefined, 'loungevelickovski@gmail.com'],
  ]) {
    if (value === undefined) delete process.env.NOTIFY_EMAIL;
    else process.env.NOTIFY_EMAIL = value;
    mock(200);
    await handler({ body: payload() });
    assert.deepEqual(JSON.parse(calls[0].init.body).to, [expected], `NOTIFY_EMAIL=${JSON.stringify(value)}`);
  }
  delete process.env.NOTIFY_EMAIL;
  console.log('primalac (NOTIFY_EMAIL sa/bez vrednosti): OK');

  // 3) druga forma se ignoriše
  mock(200);
  res = await handler({ body: payload({}, 'kontakt') });
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);

  // 4) bez RESEND_API_KEY
  delete process.env.RESEND_API_KEY;
  mock(200);
  capture();
  res = await handler({ body: payload() });
  const l4 = logged.slice();
  restore();
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
  assert.ok(l4.some((l) => l.includes('RESEND_API_KEY')));
  console.log('--- bez ključa, log: ', l4);

  // 5) Resend vraća 4xx
  process.env.RESEND_API_KEY = 'test-kljuc-nije-pravi';
  mock(422, { message: 'The from domain is not verified' });
  capture();
  res = await handler({ body: payload() });
  const l5 = logged.slice();
  restore();
  assert.equal(res.statusCode, 200);
  assert.ok(l5.some((l) => l.includes('422') && l.includes('not verified')));
  assert.ok(!l5.join(' ').includes('test-kljuc'), 'ključ ne sme u log');
  console.log('--- Resend 422, log: ', l5);

  // 6) mrežni izuzetak
  globalThis.fetch = async () => {
    throw new Error('mrežna greška');
  };
  capture();
  res = await handler({ body: payload() });
  const l6 = logged.slice();
  restore();
  assert.equal(res.statusCode, 200);
  assert.ok(l6.some((l) => l.includes('mrežna greška')));

  console.log('\ntest-submission-created: OK');
} finally {
  restore();
}
