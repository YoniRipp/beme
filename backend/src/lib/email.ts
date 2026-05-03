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

const FROM = process.env.RESEND_FROM || 'TrackVibe <onboarding@resend.dev>';

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

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TrackVibe</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">TrackVibe</span>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.5px;text-transform:uppercase;">Fitness Tracker</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">You received this email because you have a TrackVibe account.</p>
              <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} TrackVibe. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.2px;">${label}</a>`;
}

export function buildWelcomeEmail(name: string, appUrl: string): { subject: string; html: string } {
  const safeName = escapeHtml(name) || 'there';
  const subject = 'Welcome to TrackVibe 🎉';
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Welcome, ${safeName}!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">You're all set. TrackVibe helps you log food, track workouts, and hit your fitness goals — all from your phone.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      <tr>
        <td>
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Get started in 3 steps</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;">✅ &nbsp;Set your daily calorie goal</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;">🎙️ &nbsp;Log your first meal with voice</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;">💪 &nbsp;Log a workout</p>
        </td>
      </tr>
    </table>
    <div style="text-align:center;">${ctaButton(escapeHtml(appUrl), 'Open TrackVibe')}</div>
  `);
  return { subject, html };
}

export function buildInviteEmail(
  inviterName: string,
  recipientEmail: string,
  signupUrl: string,
  personalNote?: string
): { subject: string; html: string } {
  const safeInviter = escapeHtml(inviterName) || 'Someone';
  const safeNote = personalNote ? escapeHtml(personalNote) : '';
  const subject = `${safeInviter} invited you to TrackVibe`;
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">You're invited!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      <strong style="color:#374151;">${safeInviter}</strong> has invited you to join TrackVibe — a fitness app for tracking food, workouts, and progress.
    </p>
    ${safeNote ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;"><tr><td><p style="margin:0;font-size:14px;color:#166534;line-height:1.6;font-style:italic;">"${safeNote}"</p></td></tr></table>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      <tr>
        <td>
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">What you can do with TrackVibe</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;">🎙️ &nbsp;Log meals by voice — just speak naturally</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;">💪 &nbsp;Track workouts with sets &amp; reps</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;">📊 &nbsp;Monitor calories and nutrition goals</p>
        </td>
      </tr>
    </table>
    <div style="text-align:center;">${ctaButton(escapeHtml(signupUrl), 'Accept Invitation')}</div>
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">This invitation was sent to ${escapeHtml(recipientEmail)}. If you didn't expect this, you can ignore it.</p>
  `);
  return { subject, html };
}

export function buildPasswordResetEmail(resetLink: string): { subject: string; html: string } {
  const subject = 'Reset your TrackVibe password';
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">We received a request to reset your TrackVibe password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
    <div style="text-align:center;">${ctaButton(escapeHtml(resetLink), 'Reset Password')}</div>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">If you didn't request a password reset, you can safely ignore this email.</p>
  `);
  return { subject, html };
}
