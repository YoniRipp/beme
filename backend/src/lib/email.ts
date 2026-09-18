/**
 * Email sending via Resend. No-op if RESEND_API_KEY is not set.
 * @module lib/email
 */
import { Resend } from 'resend';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let resend: Resend | null = null;
if (config.resendApiKey) {
  resend = new Resend(config.resendApiKey);
}

// Falls back to Resend's shared sandbox sender, which only delivers to your own Resend
// account address. `config/index.ts` warns at boot when a key is set without this, because
// the failure is invisible: the send succeeds and reaches nobody.
const FROM = config.resendFrom || 'TrackVibe <onboarding@resend.dev>';

/**
 * Send an email. No-op if Resend is not configured.
 * @param {{ to: string, subject: string, html: string }} opts
 */
export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resend) {
    logger.warn({ to, subject: subject?.slice(0, 50) }, 'Email not sent (RESEND_API_KEY not set)');
    return;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      logger.error({ err: error }, 'Resend send error');
    }
    return data;
  } catch (err) {
    logger.error({ err }, 'Email send error');
  }
}

function escapeHtml(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
