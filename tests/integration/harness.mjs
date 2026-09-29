// Isolated integration-test environment for SAMS.
//
// Every run uses ONLY:
//   - the local Supabase stack "sams_llc_store_local" (127.0.0.1:58321 / :58322)
//   - a local Paymob mock (127.0.0.1:58410) with a test-only HMAC secret
//   - a local Next.js dev server (localhost:3100)
// assertIsolated() aborts before anything runs if any URL is not local.

import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';

// A port no other local project uses; the runner refuses to start if it is taken.
export const APP_PORT = Number(process.env.SAMS_TEST_APP_PORT || 3917);
export const APP_URL = `http://localhost:${APP_PORT}`;
export const MOCK_PAYMOB_PORT = 58410;
export const MOCK_PAYMOB_URL = `http://127.0.0.1:${MOCK_PAYMOB_PORT}`;
export const TEST_HMAC_SECRET = 'local-test-hmac-secret-not-a-real-key';
export const TEST_INTEGRATION_ID = 69632;
export const DB_CONTAINER = 'supabase_db_sams_llc_store_local';

function readLocalStack() {
  const raw = execFileSync('npx', ['-y', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'ignore'] });
  const json = JSON.parse(raw.slice(raw.indexOf('{')));
  return { url: json.API_URL, anonKey: json.ANON_KEY, serviceKey: json.SERVICE_ROLE_KEY, dbUrl: json.DB_URL };
}

export const stack = readLocalStack();

export function assertIsolated() {
  const problems = [];
  for (const [name, value] of Object.entries({ supabase: stack.url, db: stack.dbUrl, paymob: MOCK_PAYMOB_URL, app: APP_URL })) {
    const host = new URL(value.replace(/^postgresql:/, 'http:')).hostname;
    if (!['127.0.0.1', 'localhost'].includes(host)) problems.push(`${name} -> ${host}`);
  }
  if (!stack.url.endsWith(':58321')) problems.push(`supabase port is not the SAMS local stack (${stack.url})`);
  const container = execFileSync('docker', ['ps', '--filter', `name=${DB_CONTAINER}`, '--format', '{{.Names}}'], { encoding: 'utf8' }).trim();
  if (container !== DB_CONTAINER) problems.push('SAMS local database container is not running');
  if (problems.length) throw new Error(`REFUSING TO RUN - not isolated: ${problems.join('; ')}`);
}

/** Runs SQL inside the local SAMS database container only. */
export function sql(query) {
  return execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA'], {
    input: query,
    encoding: 'utf8',
  }).trim();
}

// --- Local Supabase REST helpers --------------------------------------------

export async function rest(path, { method = 'GET', token = stack.serviceKey, apikey = stack.serviceKey, body, prefer } = {}) {
  const res = await fetch(`${stack.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

export async function createStaffUser(email, fullName, role) {
  const password = crypto.randomBytes(18).toString('base64url');
  const res = await fetch(`${stack.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: stack.serviceKey, Authorization: `Bearer ${stack.serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = await res.json();
  if (!res.ok) throw new Error(`create user failed: ${res.status}`);
  if (role) await rest('staff_profiles', { method: 'POST', body: { user_id: user.id, full_name: fullName, role }, prefer: 'return=minimal' });
  const login = await fetch(`${stack.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: stack.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await login.json();
  return { id: user.id, token: session.access_token };
}

// --- Paymob mock --------------------------------------------------------------

let nextOrderId = 700000 + Math.floor(Math.random() * 100000);
export const mockState = { intentions: [], fail: false };

export function startMockPaymob() {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/__control') {
        mockState.fail = JSON.parse(body || '{}').fail === true;
        res.writeHead(204); res.end();
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/intention/') {
        if (mockState.fail) { res.writeHead(500); res.end('{}'); return; }
        const payload = JSON.parse(body || '{}');
        nextOrderId += 1;
        const intention = {
          id: `pi_test_${crypto.randomBytes(6).toString('hex')}`,
          client_secret: `omn_csk_test_${crypto.randomBytes(12).toString('hex')}`,
          intention_order_id: nextOrderId,
          status: 'intended',
        };
        mockState.intentions.push({ request: payload, response: intention, auth: req.headers.authorization });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(intention));
        return;
      }
      res.writeHead(404); res.end('{}');
    });
  });
  return new Promise((resolve) => server.listen(MOCK_PAYMOB_PORT, '127.0.0.1', () => resolve(server)));
}

export async function setMockPaymobFailure(fail) {
  await fetch(`${MOCK_PAYMOB_URL}/__control`, { method: 'POST', body: JSON.stringify({ fail }) });
}

// --- Next.js app ---------------------------------------------------------------

export function appEnv() {
  return {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_SUPABASE_URL: stack.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: stack.serviceKey,
    PAYMOB_BASE_URL: MOCK_PAYMOB_URL,
    PAYMOB_SECRET_KEY: 'omn_sk_test_localmockkey000000000000',
    PAYMOB_PUBLIC_KEY: 'omn_pk_test_localmockkey000000000000',
    PAYMOB_HMAC_SECRET: TEST_HMAC_SECRET,
    PAYMOB_INTEGRATION_ID: String(TEST_INTEGRATION_ID),
    PAYMOB_CALLBACK_BASE_URL: APP_URL,
    NEXT_PUBLIC_SITE_URL: APP_URL,
    CLIENT_IP_HEADER: 'x-nf-client-connection-ip',
  };
}

export async function assertPortFree(port) {
  const net = await import('node:net');
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error(`REFUSING TO RUN - port ${port} is already in use by another process`)));
    probe.listen(port, () => probe.close(resolve));
  });
}

/** True only for the SAMS app: its retired order lookup answers 410 with code GONE. */
async function isSamsApp() {
  try {
    const r = await fetch(`${APP_URL}/api/orders/track`, { method: 'POST' });
    if (r.status !== 410) return false;
    const body = await r.json();
    return body?.error?.code === 'GONE';
  } catch {
    return false;
  }
}

/**
 * Default: build once and run the production server (closer to the host, and
 * far lighter than `next dev`). SAMS_TEST_APP_MODE=dev uses the dev server.
 * The build inlines NEXT_PUBLIC_* from appEnv(), i.e. the LOCAL stack only.
 */
export async function startApp() {
  await assertPortFree(APP_PORT);
  const dev = process.env.SAMS_TEST_APP_MODE === 'dev';
  const env = { ...appEnv(), NODE_ENV: dev ? 'development' : 'production' };
  if (!dev) {
    const build = execFileSync('npx', ['next', 'build'], { env, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (!/Compiled successfully/.test(build)) throw new Error(`test build failed:\n${build.slice(-2000)}`);
  }
  const child = spawn('npx', ['next', dev ? 'dev' : 'start', '-p', String(APP_PORT)], { env, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (c) => { log += c; });
  child.stderr.on('data', (c) => { log += c; });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`app exited early:\n${log.slice(-2000)}`);
    if (await isSamsApp()) return { child, log: () => log };
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`app did not start:\n${log.slice(-2000)}`);
}

// --- Paymob callback signing (independent re-implementation of the spec) ----

const HMAC_FIELDS = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id',
  'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];

const read = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

export function signCallback(obj, secret = TEST_HMAC_SECRET) {
  const message = HMAC_FIELDS.map((f) => { const v = read(obj, f); return v == null ? '' : String(v); }).join('');
  return crypto.createHmac('sha512', secret).update(message).digest('hex');
}

let nextTxn = 900000000 + Math.floor(Math.random() * 1000000);
export function newTxnId() { nextTxn += 1; return nextTxn; }

export function txn({ id = newTxnId(), providerOrderId, reference, amount, currency = 'OMR', success = true, pending = false,
  integration = TEST_INTEGRATION_ID, refunded = false, voided = false }) {
  return {
    id, amount_cents: amount, created_at: '2026-09-29T10:00:00.000000', currency, error_occured: !success && !pending,
    has_parent_transaction: false, integration_id: integration, is_3d_secure: true, is_auth: false, is_capture: false,
    is_refunded: refunded, is_standalone_payment: true, is_voided: voided,
    order: { id: providerOrderId, merchant_order_id: reference }, owner: 1, pending, success,
    source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
  };
}

export async function postWebhook(obj, { hmac = signCallback(obj) } = {}) {
  const res = await fetch(`${APP_URL}/api/paymob/webhook?hmac=${hmac}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'TRANSACTION', obj }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// --- Customer-facing helpers ----------------------------------------------------

let ipCounter = 10;
export function freshIp() { ipCounter += 1; return `203.0.113.${ipCounter % 250}`; }

export const customer = (tag) => ({
  fullName: `TEST ${tag} Customer`,
  email: `test.${tag}@example.com`,
  phone: '+968 9000 1234',
  address: 'TEST address, Ruwi, Muscat',
});

export async function checkout(items, { ip = freshIp(), tag = 'buyer', extraHeaders = {} } = {}) {
  const res = await fetch(`${APP_URL}/api/checkout/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': ip, ...extraHeaders },
    body: JSON.stringify({ customer: customer(tag), items }),
  });
  return { status: res.status, body: await res.json().catch(() => null), setCookie: res.headers.get('set-cookie') };
}

export async function paymentFor(orderNumber) {
  const r = await rest(`payments?select=id,order_id,special_reference,provider_order_id,amount_minor,status,integration_ids,environment,orders!inner(order_number,total_minor,public_token)&orders.order_number=eq.${orderNumber}&order=created_at.asc`);
  return r.body;
}

export async function orderState(orderNumber) {
  const r = await rest(`orders?select=id,status,payment_status,paymob_transaction_id,paid_at,staff_notes&order_number=eq.${orderNumber}`);
  return r.body[0];
}
