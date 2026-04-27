import { Router, type IRouter } from 'express';
import { logger } from '../lib/logger';
import { sendInvoiceEmail, sendPaymentConfirmationEmail } from '../emailService';

const router: IRouter = Router();

router.post('/email/send-invoice', async (req, res) => {
  const {
    toEmail,
    toName,
    fromBusinessName,
    fromEmail,
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
  } = req.body;

  if (!toEmail || !fromBusinessName || !invoiceId || !lineItems || !total || !currency || !dueDate) {
    return res.status(400).json({ error: 'Missing required fields: toEmail, fromBusinessName, invoiceId, lineItems, total, currency, dueDate' });
  }

  try {
    await sendInvoiceEmail({
      toEmail,
      toName: toName ?? toEmail,
      fromBusinessName,
      fromEmail: fromEmail ?? 'noreply@invoicebeta.app',
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

export default router;
