import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deliver, getEmailProvider, type EmailProvider, type OutboxRow } from '@/lib/notifications';
import { fetchTransaction, getInquiryConfig, type InquiredTransaction } from '@/lib/paymobInquiry';

/*
 * Recovery worker: every step is idempotent and safe to run concurrently.
 *   1. finish stored-but-unprocessed Paymob callbacks
 *   2. release stock held by expired checkout reservations
 *   3. verify refund/void reports against Paymob and reconcile them
 *   4. deliver pending notifications (only if a provider is configured)
 * Triggered by /api/internal/recovery (manual / Netlify scheduled function),
 * and partially by webhooks and customer status polling.
 */

export interface RecoveryDeps {
  inquire?: (transactionId: string) => Promise<InquiredTransaction>;
  emailProvider?: EmailProvider | null;
  env?: NodeJS.ProcessEnv;
}

export interface RecoveryReport {
  callbacksProcessed: number;
  reservationsReleased: number;
  refunds: { verified: number; deferred: number; failed: number; skipped: string | null };
  notifications: { sent: number; retried: number; skipped: string | null };
  errors: string[];
}

export async function runRecovery(db: SupabaseClient, deps: RecoveryDeps = {}): Promise<RecoveryReport> {
  const env = deps.env ?? process.env;
  const report: RecoveryReport = {
    callbacksProcessed: 0,
    reservationsReleased: 0,
    refunds: { verified: 0, deferred: 0, failed: 0, skipped: null },
    notifications: { sent: 0, retried: 0, skipped: null },
    errors: [],
  };

  const callbacks = await db.rpc('process_pending_paymob_callbacks', { p_limit: 50 });
  if (callbacks.error) report.errors.push(`callbacks: ${callbacks.error.message.slice(0, 120)}`);
  else report.callbacksProcessed = Number(callbacks.data) || 0;

  // One order per call (one transaction each): never holds locks across orders.
  for (let i = 0; i < 100; i++) {
    const released = await db.rpc('release_next_expired_order');
    if (released.error) {
      report.errors.push(`reservations: ${released.error.message.slice(0, 120)}`);
      break;
    }
    const count = Number(released.data) || 0;
    if (count === 0) break;
    report.reservationsReleased += count;
  }

  const inquiryConfig = getInquiryConfig(env);
  const inquire = deps.inquire ?? (inquiryConfig ? (id: string) => fetchTransaction(inquiryConfig, id) : null);
  if (!inquire) {
    report.refunds.skipped = 'PAYMOB_API_KEY not configured';
  } else {
    const jobs = await db.rpc('claim_refund_verifications', { p_limit: 3 });
    if (jobs.error) report.errors.push(`refund claim: ${jobs.error.message.slice(0, 120)}`);
    for (const job of (jobs.data ?? []) as { id: string; transaction_id: string }[]) {
      try {
        const reported = await inquire(job.transaction_id);
        // Always reconcile at the original (parent) transaction level, using its cumulative refunded amount.
        const parent = reported.is_refund || reported.is_void || reported.has_parent_transaction
          ? reported.parent_transaction ? await inquire(reported.parent_transaction) : null
          : reported;
        if (!parent) throw new Error('refund transaction has no parent');
        const applied = await db.rpc('apply_refund_reconciliation', {
          p_verification_id: job.id,
          p_parent: parent,
          p_source_transaction_id: reported.id,
        });
        if (applied.error) throw new Error(applied.error.message);
        if (applied.data === 'awaiting_parent') report.refunds.deferred += 1;
        else report.refunds.verified += 1;
      } catch (err) {
        report.refunds.failed += 1;
        await db.rpc('fail_refund_verification', { p_verification_id: job.id, p_error: err instanceof Error ? err.message : 'failed' });
      }
    }
  }

  const provider = deps.emailProvider === undefined ? getEmailProvider(env) : deps.emailProvider;
  if (!provider) {
    report.notifications.skipped = 'NOTIFICATION_PROVIDER disabled';
  } else {
    const rows = await db.rpc('claim_notifications', { p_limit: 10 });
    if (rows.error) report.errors.push(`notification claim: ${rows.error.message.slice(0, 120)}`);
    for (const row of (rows.data ?? []) as OutboxRow[]) {
      const result = await deliver(row, provider, env);
      if (result.status === 'sent') {
        await db.rpc('complete_notification', { p_id: row.id, p_provider_message_id: result.providerId });
        report.notifications.sent += 1;
      } else {
        await db.rpc('fail_notification', { p_id: row.id, p_error: result.error });
        report.notifications.retried += 1;
      }
    }
  }

  return report;
}
