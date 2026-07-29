import { env } from "../config/env";

interface PasswordResetEmailInput {
  toEmail: string;
  resetUrl: string;
}

// No real email provider is wired up yet (Phase 0/1 explicitly deferred
// this). This is a dev-safe stand-in: outside production it logs the reset
// URL to the server console so the flow is actually usable locally; in
// production it does NOT pretend an email was sent — it logs a warning so
// the gap is visible in server logs, since silently no-op-ing here would be
// worse than being loud about a missing integration. The HTTP response to
// the client is identical either way (see auth.service.ts) so this never
// leaks account existence.
export async function sendPasswordResetEmail({ toEmail, resetUrl }: PasswordResetEmailInput): Promise<void> {
  if (!env.isProduction) {
    console.log(`[dev-email] Password reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  console.warn(
    `[email] No email provider is configured — password reset email to ${toEmail} was NOT actually sent.`
  );
}
