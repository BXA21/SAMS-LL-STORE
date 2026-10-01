// Runs the integration suite against the isolated local environment only.
// Usage: npm run test:integration   (requires `npx supabase start` for this repo)
import { spawn, spawnSync } from 'node:child_process';
import { assertIsolated, sql, startApp, startMockPaymob, stack, APP_URL, MOCK_PAYMOB_URL } from './integration/harness.mjs';

assertIsolated();
process.stdout.write(`Isolated environment:\n  database: ${stack.url} (local SAMS stack)\n  paymob:   ${MOCK_PAYMOB_URL} (local mock)\n  app:      ${APP_URL}\n\n`);

// Fixture (local database only): real products start untracked-quantity 0 by
// design; give them ample stock so the general checkout tests can buy them.
// Stock-specific tests create their own throwaway products.
sql(`update public.product_inventory set stock_on_hand = greatest(stock_on_hand, 100000), quantity_confirmed = true
     where product_id in (select id from public.products where slug not like 'test-p2-%');`);

const mock = await startMockPaymob();
const app = await startApp();
let status = 1;
try {
  // Async spawn: the Paymob mock lives in THIS process and must keep serving.
  status = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test', '--test-concurrency=1', 'tests/integration/*.test.mjs'], {
      stdio: 'inherit',
      env: { ...process.env, SAMS_INTEGRATION_RUNNER: '1' },
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
} finally {
  mock.close();
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(app.child.pid), '/T', '/F'], { stdio: 'ignore' });
  else app.child.kill('SIGTERM');
}
process.exit(status);
