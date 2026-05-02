import { Router, type IRouter } from 'express';
import { logger } from '../lib/logger';
import { sendInvoiceEmail, sendPaymentConfirmationEmail, sendReviewRequestEmail } from '../emailService';
import { findUserById } from '../connectDb';

const router: IRouter = Router();

router.post('/email/send-invoice', async (req, res) => {
  const {
    toEmail,
    toName,
    fromBusinessName,
    fromEmail,
    fromUserId,
    invoiceNumber,
    invoiceId,
    lineItems,
    total,
    depositAmount,
    remainingBalance,
    currency,
    dueDate,
    paymentLink,
    notes,
    status,
    bankDetails,
    invoiceColor,
  } = req.body;

  if (!toEmail || !fromBusinessName || !invoiceId || !lineItems || !total || !currency || !dueDate) {
    return res.status(400).json({ error: 'Missing required fields: toEmail, fromBusinessName, invoiceId, lineItems, total, currency, dueDate' });
  }

  try {
    const senderHasLogo = fromUserId
      ? !!(await findUserById(fromUserId))?.logo_data
      : false;
    const domains = process.env.REPLIT_DOMAINS ?? '';
    const domain = domains.split(',')[0].trim();
    const baseUrl = domain ? `https://${domain}` : 'http://localhost:8080';
    const fromLogoUrl = senderHasLogo && fromUserId
      ? `${baseUrl}/api/logo/${fromUserId}`
      : undefined;
    await sendInvoiceEmail({
      toEmail,
      toName: toName ?? toEmail,
      fromBusinessName,
      fromEmail: fromEmail ?? 'noreply@invoicebeta.app',
      fromLogoData: fromLogoUrl,
      invoiceNumber,
      invoiceId,
      lineItems,
      total,
      depositAmount,
      remainingBalance,
      currency,
      dueDate,
      paymentLink,
      notes,
      status: status ?? 'draft',
      bankDetails: bankDetails ?? undefined,
      invoiceColor: invoiceColor ?? undefined,
    });
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to send invoice email');
    res.status(500).json({ error: err.message ?? 'Failed to send email.' });
  }
});

router.post('/email/send-confirmation', async (req, res) => {
  const {
    toEmail,
    toName,
    fromBusinessName,
    fromEmail,
    invoiceNumber,
    invoiceId,
    amountPaid,
    currency,
    paymentType,
  } = req.body;

  if (!toEmail || !fromBusinessName || !invoiceId || !amountPaid || !currency || !paymentType) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    await sendPaymentConfirmationEmail({
      toEmail,
      toName: toName ?? toEmail,
      fromBusinessName,
      fromEmail: fromEmail ?? 'noreply@invoicebeta.app',
      invoiceNumber,
      invoiceId,
      amountPaid,
      currency,
      paymentType,
    });
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to send confirmation email');
    res.status(500).json({ error: err.message ?? 'Failed to send email.' });
  }
});

router.post('/email/send-review-request', async (req, res) => {
  const { toEmail, toName, businessName, reviewUrl } = req.body;
  if (!toEmail || !businessName || !reviewUrl) {
    return res.status(400).json({ error: 'Missing required fields: toEmail, businessName, reviewUrl' });
  }
  try {
    await sendReviewRequestEmail(toEmail, toName ?? toEmail, businessName, reviewUrl);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to send review request email');
    res.status(500).json({ error: err.message ?? 'Failed to send email.' });
  }
});

export default router;
