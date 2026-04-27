import { Router, type IRouter, type Request } from 'express';
import { getUncachableStripeClient } from '../stripeClient';
import { logger } from '../lib/logger';
import {
  getConnectedAccount,
  upsertConnectedAccount,
  deleteConnectedAccount,
} from '../connectDb';

const router: IRouter = Router();

const CONNECT_CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID ?? '';

router.get('/stripe/connect/url', async (req, res) => {
  const userId = req.query['userId'] as string;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!CONNECT_CLIENT_ID) {
    return res.status(503).json({ error: 'Stripe Connect client_id not configured. Add STRIPE_CONNECT_CLIENT_ID to environment.' });
  }
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  const baseUrl = `https://${(process.env.REPLIT_DOMAINS ?? '').split(',')[0]}`;
  const redirectUri = `${baseUrl}/api/stripe/connect/callback`;
  const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${CONNECT_CLIENT_ID}&scope=read_write&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url });
});

router.get('/stripe/connect/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string>;
  logger.info({ query: req.query }, 'Stripe Connect callback received');

  if (error) {
    const detail = error_description ? `${error}: ${error_description}` : error;
    logger.warn({ error, error_description }, 'Stripe Connect OAuth error');
    return res.status(400).send(htmlPage('Connection failed', `Stripe error: ${detail}`, false));
  }
  if (!code || !state) {
    logger.warn({ hasCode: !!code, hasState: !!state }, 'Missing code or state in callback');
    return res.status(400).send(htmlPage('Invalid request', 'Missing code or state parameter from Stripe.', false));
  }
  let userId: string;
  try {
    userId = JSON.parse(Buffer.from(state, 'base64url').toString()).userId;
  } catch (e) {
    logger.error({ state, err: e }, 'Could not parse state parameter');
    return res.status(400).send(htmlPage('Invalid state', 'Could not parse state parameter.', false));
  }
  try {
    const stripe = await getUncachableStripeClient();
    const response = await (stripe as any).oauth.token({ grant_type: 'authorization_code', code });
    const accountId: string = response.stripe_user_id;
    logger.info({ userId, accountId }, 'Stripe account connected successfully');
    await upsertConnectedAccount(userId, accountId);
    res.send(htmlPage('Stripe connected!', 'Your Stripe account has been connected successfully. Return to the app to continue.', true));
  } catch (err: any) {
    logger.error({ err: err.message }, 'OAuth token exchange failed');
    res.status(500).send(htmlPage('Connection failed', err.message ?? 'An error occurred.', false));
  }
});

router.get('/stripe/connect/status', async (req, res) => {
  const userId = req.query['userId'] as string;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const accountId = await getConnectedAccount(userId);
  res.json({ connected: !!accountId, accountId: accountId ?? null });
});

router.delete('/stripe/connect', async (req, res) => {
  const userId = req.query['userId'] as string;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  await deleteConnectedAccount(userId);
  res.json({ ok: true });
});

router.post('/stripe/invoice/checkout', async (req, res) => {
  const { userId, amount, currency, description, invoiceRef } = req.body as {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    invoiceRef?: string;
  };
  if (!userId || !amount || !currency) {
    return res.status(400).json({ error: 'userId, amount, and currency are required' });
  }
  const accountId = await getConnectedAccount(userId);
  if (!accountId) {
    return res.status(404).json({ error: 'No connected Stripe account for this user. Connect Stripe first.' });
  }
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${(process.env.REPLIT_DOMAINS ?? '').split(',')[0]}`;
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(amount * 100),
              product_data: { name: description || 'Invoice payment' },
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/payment-success`,
        cancel_url: `${baseUrl}/payment-cancelled`,
        metadata: { invoiceRef: invoiceRef ?? '' },
      },
      { stripeAccount: accountId }
    );
    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Stripe Checkout session creation failed');
    res.status(400).json({ error: err.message ?? 'Failed to create Stripe Checkout session.' });
  }
});

export default router;

function htmlPage(title: string, message: string, success: boolean): string {
  const color = success ? '#4a7c59' : '#c0392b';
  const icon = success ? '&#10003;' : '&#10007;';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f0;color:#1a1a1a}.card{background:#fff;border-radius:12px;padding:48px 40px;max-width:420px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.08)}.icon{width:64px;height:64px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:28px;color:#fff}h1{font-size:22px;margin:0 0 12px;color:${color}}p{font-size:15px;line-height:1.6;color:#555;margin:0}</style></head><body><div class="card"><div class="icon">${icon}</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
