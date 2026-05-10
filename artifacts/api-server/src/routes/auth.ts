import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
  updateUserLogo,
  updateUserProfile,
  createResetToken,
  findResetToken,
  markResetTokenUsed,
} from '../connectDb';
import { sendPasswordResetEmail } from '../emailService';
import { logger } from '../lib/logger';

const router = Router();

function getBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS ?? '';
  const domain = domains.split(',')[0].trim();
  if (domain) return `https://${domain}`;
  return 'http://localhost:8080';
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

router.post('/auth/signup', async (req, res) => {
  const { email, password, businessName } = req.body ?? {};
  if (!email || !password || !businessName) {
    return res.status(400).json({ error: 'Email, password, and business name are required' });
  }

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = 'user_' + Date.now().toString() + crypto.randomBytes(4).toString('hex');
  const hash = await bcrypt.hash(password, 12);
  await createUser(id, email, hash, businessName);

  logger.info({ id, email }, 'User signed up');
  res.json({ ok: true, user: { id, email, businessName } });
});

router.post('/auth/signin', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  logger.info({ id: user.id, email }, 'User signed in');
  res.json({ ok: true, user: { id: user.id, email: user.email, businessName: user.business_name, vatNumber: user.vat_number ?? undefined, businessAddress: user.business_address ?? undefined } });
});

router.put('/auth/logo', async (req, res) => {
  const { userId, logoData } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  await updateUserLogo(userId, logoData ?? null);
  logger.info({ userId }, 'Logo updated');
  res.json({ ok: true });
});

router.put('/auth/profile', async (req, res) => {
  const { userId, vatNumber, businessAddress } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  await updateUserProfile(userId, vatNumber ?? null, businessAddress ?? null);
  logger.info({ userId }, 'Profile updated');
  res.json({ ok: true });
});

router.get('/logo/:userId', async (req, res) => {
  const user = await findUserById(req.params.userId);
  if (!user?.logo_data) return res.status(404).end();

  const dataUri = user.logo_data;
  const mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const base64 = dataUri.replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(base64, 'base64');

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(buf);
});

router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await findUserByEmail(email);
  if (!user) {
    return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await createResetToken(token, user.id, expiresAt);

  const resetUrl = `${getBaseUrl()}/api/auth/reset/${token}`;
  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    logger.error({ err }, 'Failed to send password reset email');
    return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }

  res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
});

router.get('/auth/reset/:token', async (req, res) => {
  const { token } = req.params;
  const record = await findResetToken(token);

  const invalid = !record || record.used || new Date(record.expires_at) < new Date();

  if (invalid) {
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Link expired</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#fff;padding:40px;border-radius:12px;max-width:420px;width:100%;box-shadow:0 1px 8px rgba(0,0,0,0.06);text-align:center;}
h2{color:#1f2937;margin:0 0 12px;}p{color:#6b7280;font-size:14px;}</style></head>
<body><div class="card"><h2>Link expired</h2><p>This password reset link is no longer valid. Please request a new one from the app.</p></div></body></html>`);
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Reset password</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;}
body{margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#fff;padding:40px;border-radius:12px;max-width:420px;width:100%;box-shadow:0 1px 8px rgba(0,0,0,0.06);}
h2{color:#1f2937;margin:0 0 8px;font-size:22px;}
p.sub{color:#6b7280;font-size:14px;margin:0 0 28px;}
label{display:block;color:#374151;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;}
input{width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none;transition:border-color 0.15s;}
input:focus{border-color:#3d5a4c;}
.field{margin-bottom:16px;}
.rules{background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#6b7280;line-height:1.8;}
.rules span{display:block;}
button{width:100%;padding:14px;background:#3d5a4c;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-top:4px;}
button:disabled{opacity:0.6;cursor:not-allowed;}
.msg{margin-top:16px;padding:12px;border-radius:8px;font-size:14px;text-align:center;}
.msg.ok{background:#dcfce7;color:#16a34a;}
.msg.err{background:#fee2e2;color:#dc2626;}
</style></head>
<body>
<div class="card">
  <h2>Set new password</h2>
  <p class="sub">Choose a strong password for your account.</p>
  <form id="form">
    <div class="field"><label>New password</label><input type="password" id="pw" placeholder="••••••••" required></div>
    <div class="field"><label>Confirm password</label><input type="password" id="pw2" placeholder="••••••••" required></div>
    <div class="rules">
      <span id="r-len">&#x25CB; At least 8 characters</span>
      <span id="r-upper">&#x25CB; One uppercase letter</span>
      <span id="r-num">&#x25CB; One number</span>
      <span id="r-special">&#x25CB; One special character</span>
    </div>
    <button type="submit" id="btn">Reset password</button>
    <div id="msg" class="msg" style="display:none;"></div>
  </form>
</div>
<script>
const pw = document.getElementById('pw');
const rules = {len: document.getElementById('r-len'), upper: document.getElementById('r-upper'), num: document.getElementById('r-num'), special: document.getElementById('r-special')};
function check(val) {
  const ok = (el, pass) => { el.textContent = (pass ? '\\u25CF ' : '\\u25CB ') + el.textContent.slice(2); el.style.color = pass ? '#16a34a' : '#6b7280'; return pass; };
  return ok(rules.len, val.length >= 8) & ok(rules.upper, /[A-Z]/.test(val)) & ok(rules.num, /[0-9]/.test(val)) & ok(rules.special, /[^A-Za-z0-9]/.test(val));
}
pw.addEventListener('input', () => check(pw.value));
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  if (!check(pw.value)) { msg.className = 'msg err'; msg.textContent = 'Please meet all password requirements.'; msg.style.display='block'; return; }
  if (pw.value !== document.getElementById('pw2').value) { msg.className = 'msg err'; msg.textContent = 'Passwords do not match.'; msg.style.display='block'; return; }
  btn.disabled = true; btn.textContent = 'Saving...';
  const res = await fetch(location.pathname, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});
  const data = await res.json();
  if (data.ok) { msg.className = 'msg ok'; msg.textContent = 'Password updated! You can now sign in to the app.'; document.getElementById('form').innerHTML = ''; }
  else { msg.className = 'msg err'; msg.textContent = data.error || 'Something went wrong.'; btn.disabled=false; btn.textContent='Reset password'; }
  msg.style.display='block';
});
</script>
</body></html>`);
});

router.post('/auth/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body ?? {};

  if (!password) return res.status(400).json({ error: 'Password is required' });

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const record = await findResetToken(token);
  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
  }

  const hash = await bcrypt.hash(password, 12);
  await updateUserPassword(record.user_id, hash);
  await markResetTokenUsed(token);

  const user = await findUserById(record.user_id);
  logger.info({ userId: record.user_id }, 'Password reset successfully');
  res.json({ ok: true, email: user?.email });
});

export default router;
