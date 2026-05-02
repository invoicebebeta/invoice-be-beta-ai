import { Router, type IRouter } from 'express';
import { logger } from '../lib/logger';
import { upsertPushToken, getPushTokensByUserId } from '../connectDb';

const router: IRouter = Router();

router.post('/push/register', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token are required' });
  }
  try {
    await upsertPushToken(userId, token);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to register push token');
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

router.post('/push/send', async (req, res) => {
  const { userId, title, body } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title are required' });
  }
  try {
    const tokens = await getPushTokensByUserId(userId);
    if (!tokens.length) {
      return res.json({ ok: true, sent: 0 });
    }
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body: body ?? '',
      data: {},
    }));
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(messages),
    });
    res.json({ ok: true, sent: tokens.length });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to send push notification');
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

export default router;
