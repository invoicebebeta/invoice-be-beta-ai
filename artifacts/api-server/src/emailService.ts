import { Resend } from 'resend';
import { logger } from './lib/logger';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface SendInvoiceParams {
  toEmail: string;
  toName: string;
  fromBusinessName: string;
  fromEmail: string;
  fromLogoData?: string;
  invoiceNumber?: string;
  invoiceId: string;
  lineItems: { name: string; quantity: number; price: number }[];
  total: number;
  depositAmount?: number;
  remainingBalance?: number;
  currency: string;
  dueDate: string;
  paymentLink?: string;
  notes?: string;
  status: string;
}

export interface SendPaymentConfirmationParams {
  toEmail: string;
  toName: string;
  fromBusinessName: string;
  fromEmail: string;
  invoiceNumber?: string;
  invoiceId: string;
  amountPaid: number;
  currency: string;
  paymentType: 'deposit' | 'full';
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildInvoiceEmail(p: SendInvoiceParams): string {
  const ref = p.invoiceNumber ?? p.invoiceId;
  const itemRows = p.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;color:#374151;font-size:14px;">${item.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;color:#374151;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;color:#374151;font-size:14px;text-align:right;">${formatMoney(item.price * item.quantity, p.currency)}</td>
      </tr>`,
    )
    .join('');

  const paymentSection = p.paymentLink
    ? `
    <div style="margin:32px 0;text-align:center;">
      <a href="${p.paymentLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.01em;">
        Pay Now
      </a>
    </div>`
    : '';

  const depositNote =
    p.depositAmount && p.depositAmount > 0 && p.status === 'awaiting_deposit'
      ? `<p style="margin:16px 0;color:#6b7280;font-size:14px;text-align:center;">Deposit due: <strong style="color:#1f2937;">${formatMoney(p.depositAmount, p.currency)}</strong></p>`
      : '';

  const notesSection = p.notes
    ? `<p style="margin:24px 0 0;padding:16px;background:#f9fafb;border-radius:8px;color:#6b7280;font-size:13px;line-height:1.6;"><strong>Notes:</strong> ${p.notes}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
    <div style="background:#3d5a4c;padding:32px 40px;">
      ${p.fromLogoData ? `<img src="${p.fromLogoData}" alt="${p.fromBusinessName}" style="width:60px;height:60px;border-radius:10px;object-fit:cover;margin-bottom:14px;display:block;">` : ''}
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;">Invoice</p>
      <h1 style="margin:4px 0 0;color:#ffffff;font-size:26px;font-weight:700;">${p.fromBusinessName}</h1>
    </div>
    <div style="padding:32px 40px;">
      <table style="width:100%;margin-bottom:8px;">
        <tr>
          <td style="color:#6b7280;font-size:13px;">Invoice ref</td>
          <td style="color:#1f2937;font-size:13px;font-weight:600;text-align:right;">${ref}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding-top:6px;">Due date</td>
          <td style="color:#1f2937;font-size:13px;font-weight:600;text-align:right;padding-top:6px;">${formatDate(p.dueDate)}</td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #eef0f3;margin:20px 0;">

      <table style="width:100%;">
        <thead>
          <tr>
            <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:8px;">Item</th>
            <th style="text-align:center;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:8px;">Qty</th>
            <th style="text-align:right;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:8px;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;text-align:right;">
        <p style="margin:0;color:#6b7280;font-size:13px;">Total</p>
        <p style="margin:4px 0 0;color:#1f2937;font-size:24px;font-weight:700;">${formatMoney(p.total, p.currency)}</p>
      </div>

      ${depositNote}
      ${paymentSection}
      ${notesSection}
    </div>
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #eef0f3;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        Sent by ${p.fromBusinessName} &middot; ${p.fromEmail}
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildConfirmationEmail(p: SendPaymentConfirmationParams): string {
  const ref = p.invoiceNumber ?? p.invoiceId;
  const label = p.paymentType === 'deposit' ? 'Deposit payment received' : 'Payment received in full';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
    <div style="background:#16a34a;padding:32px 40px;text-align:center;">
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:#ffffff;font-size:28px;">&#10003;</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${label}</h1>
    </div>
    <div style="padding:32px 40px;text-align:center;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Amount paid</p>
      <p style="margin:0 0 24px;color:#1f2937;font-size:32px;font-weight:700;">${formatMoney(p.amountPaid, p.currency)}</p>
      <p style="margin:0;color:#6b7280;font-size:14px;">Invoice ref: <strong style="color:#1f2937;">${ref}</strong></p>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #eef0f3;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        From ${p.fromBusinessName} &middot; ${p.fromEmail}
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildInvoiceText(p: SendInvoiceParams): string {
  const ref = p.invoiceNumber ?? p.invoiceId;
  const lines: string[] = [
    `Invoice ${ref} from ${p.fromBusinessName}`,
    `Due: ${formatDate(p.dueDate)}`,
    '',
    'Items:',
    ...p.lineItems.map(i => `  ${i.name} x${i.quantity} — ${formatMoney(i.price * i.quantity, p.currency)}`),
    '',
    `Total: ${formatMoney(p.total, p.currency)}`,
  ];
  if (p.depositAmount && p.depositAmount > 0 && p.status === 'awaiting_deposit') {
    lines.push(`Deposit due: ${formatMoney(p.depositAmount, p.currency)}`);
  }
  if (p.paymentLink) {
    lines.push('', `Pay online: ${p.paymentLink}`);
  }
  if (p.notes) {
    lines.push('', `Notes: ${p.notes}`);
  }
  lines.push('', `Sent by ${p.fromBusinessName} — ${p.fromEmail}`);
  return lines.join('\n');
}

export async function sendInvoiceEmail(p: SendInvoiceParams): Promise<void> {
  const resend = getResend();
  const ref = p.invoiceNumber ?? p.invoiceId;
  const subject = `Invoice ${ref} from ${p.fromBusinessName}`;
  const html = buildInvoiceEmail(p);
  const text = buildInvoiceText(p);

  const { data, error } = await resend.emails.send({
    from: `${p.fromBusinessName} <invoices@invoicebebeta.com>`,
    reply_to: p.fromEmail,
    to: [p.toEmail],
    subject,
    html,
    text,
  });

  if (error) {
    logger.error({ error }, 'Resend email send failed');
    throw new Error(error.message);
  }
  logger.info({ id: data?.id, to: p.toEmail, subject }, 'Invoice email sent');
}

export async function sendReviewRequestEmail(
  toEmail: string,
  toName: string,
  businessName: string,
  reviewUrl: string
): Promise<void> {
  const resend = getResend();
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
    <div style="background:#3d5a4c;padding:32px 40px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${businessName}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Would love your feedback</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">Hi ${toName},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">Thank you for working with us! It would mean a lot if you could take a moment to leave a review — it helps us grow and lets future customers know what to expect.</p>
      <div style="margin:28px 0;text-align:center;">
        <a href="${reviewUrl}" style="display:inline-block;background:#3d5a4c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Leave a review</a>
      </div>
      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">Only takes a minute. We really appreciate it.</p>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #eef0f3;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by ${businessName} via Invoice Be Beta</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${toName},\n\nThank you for working with ${businessName}! It would mean a lot if you could take a moment to leave a review.\n\nLeave a review: ${reviewUrl}\n\nOnly takes a minute — we really appreciate it.\n\nSent by ${businessName} via Invoice Be Beta`;

  const { error } = await resend.emails.send({
    from: `${businessName} <invoices@invoicebebeta.com>`,
    to: [toEmail],
    subject: `How was your experience with ${businessName}?`,
    html,
    text,
  });

  if (error) {
    logger.error({ error }, 'Review request email failed');
    throw new Error(error.message);
  }
  logger.info({ to: toEmail }, 'Review request email sent');
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  const resend = getResend();
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
    <div style="background:#3d5a4c;padding:32px 40px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Reset your password</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">We received a request to reset the password for your Invoice Be Beta account. Click the button below to choose a new password.</p>
      <div style="margin:28px 0;text-align:center;">
        <a href="${resetUrl}" style="display:inline-block;background:#3d5a4c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Reset password</a>
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">This link expires in 1 hour. If you did not request a password reset, you can ignore this email — your account is safe.</p>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #eef0f3;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Invoice Be Beta</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Reset your Invoice Be Beta password\n\nWe received a request to reset the password for your account. Click the link below to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, you can ignore this email — your account is safe.\n\nInvoice Be Beta`;

  const { error } = await resend.emails.send({
    from: 'Invoice Be Beta <hello@invoicebebeta.com>',
    to: [toEmail],
    subject: 'Reset your Invoice Be Beta password',
    html,
    text,
  });

  if (error) {
    logger.error({ error }, 'Password reset email failed');
    throw new Error(error.message);
  }
  logger.info({ to: toEmail }, 'Password reset email sent');
}

export async function sendPaymentConfirmationEmail(p: SendPaymentConfirmationParams): Promise<void> {
  const resend = getResend();
  const ref = p.invoiceNumber ?? p.invoiceId;
  const label = p.paymentType === 'deposit' ? 'deposit received' : 'payment received';
  const subject = `${p.fromBusinessName}: ${label} for invoice ${ref}`;
  const html = buildConfirmationEmail(p);

  const paymentLabel = p.paymentType === 'deposit' ? 'Deposit payment received' : 'Payment received in full';
  const text = `${paymentLabel}\n\nAmount paid: ${formatMoney(p.amountPaid, p.currency)}\nInvoice ref: ${ref}\n\nThank you for your payment.\n\nFrom ${p.fromBusinessName}`;

  const { data, error } = await resend.emails.send({
    from: `${p.fromBusinessName} <invoices@invoicebebeta.com>`,
    reply_to: p.fromEmail,
    to: [p.toEmail],
    subject,
    html,
    text,
  });

  if (error) {
    logger.error({ error }, 'Resend confirmation email failed');
    throw new Error(error.message);
  }
  logger.info({ id: data?.id, to: p.toEmail }, 'Payment confirmation email sent');
}
