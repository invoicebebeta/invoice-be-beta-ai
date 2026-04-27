import { Router } from 'express';
import crypto from 'node:crypto';
import { findUserById, insertReview, getReviewsByUserId } from '../connectDb';
import { logger } from '../lib/logger';

const router = Router();

function starSvg(filled: boolean) {
  const color = filled ? '#f59e0b' : '#e5e7eb';
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
}

function renderStars(rating: number, size = 20) {
  return Array.from({ length: 5 }, (_, i) => {
    const filled = i < rating;
    const color = filled ? '#f59e0b' : '#e5e7eb';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }).join('');
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

router.get('/review/:userId', async (req, res) => {
  const { userId } = req.params;
  const { customer, ref } = req.query as { customer?: string; ref?: string };

  const user = await findUserById(userId);
  const businessName = user?.business_name ?? 'This business';

  const existing = await getReviewsByUserId(userId);
  const avgRating = existing.length
    ? existing.reduce((s, r) => s + r.rating, 0) / existing.length
    : 0;

  const reviewCards = existing.length === 0
    ? `<p style="color:#9ca3af;font-size:14px;text-align:center;margin:0 0 32px;">No reviews yet — be the first!</p>`
    : existing.map(r => `
      <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;gap:2px;">${renderStars(r.rating, 16)}</div>
          <span style="color:#9ca3af;font-size:12px;">${r.customer_name ?? 'Customer'} &middot; ${formatDate(r.created_at)}</span>
        </div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${r.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>`).join('');

  const avgDisplay = existing.length ? avgRating.toFixed(1) : '—';
  const reviewCountLabel = existing.length === 1 ? '1 review' : `${existing.length} reviews`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${businessName} — Reviews</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px 16px 48px;}
    .wrap{max-width:540px;margin:0 auto;}
    .header{background:#3d5a4c;border-radius:14px;padding:28px 24px;margin-bottom:20px;color:#fff;}
    .biz-name{font-size:22px;font-weight:700;margin-bottom:12px;}
    .rating-row{display:flex;align-items:center;gap:10px;}
    .avg{font-size:36px;font-weight:700;}
    .stars-count{display:flex;flex-direction:column;gap:4px;}
    .count{font-size:13px;opacity:0.8;}
    .card{background:#fff;border-radius:14px;padding:24px;margin-bottom:20px;}
    .card h2{font-size:17px;font-weight:700;color:#1f2937;margin-bottom:16px;}
    .reviews-section{margin-bottom:20px;}
    label{display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:6px;}
    input,textarea{width:100%;padding:11px 13px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:15px;font-family:inherit;outline:none;transition:border-color 0.15s;}
    input:focus,textarea:focus{border-color:#3d5a4c;}
    .field{margin-bottom:14px;}
    .stars-input{display:flex;gap:6px;margin-bottom:16px;}
    .star-btn{background:none;border:none;cursor:pointer;padding:2px;font-size:0;transition:transform 0.1s;}
    .star-btn:hover{transform:scale(1.15);}
    button[type=submit]{width:100%;padding:14px;background:#3d5a4c;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-top:4px;}
    button[type=submit]:disabled{opacity:0.6;cursor:not-allowed;}
    .msg{margin-top:16px;padding:14px;border-radius:8px;font-size:14px;text-align:center;}
    .msg.ok{background:#dcfce7;color:#16a34a;}
    .msg.err{background:#fee2e2;color:#dc2626;}
    .powered{text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="biz-name">${businessName}</div>
    <div class="rating-row">
      <span class="avg">${avgDisplay}</span>
      <div class="stars-count">
        <div style="display:flex;gap:2px;">${existing.length ? renderStars(Math.round(avgRating), 20) : ''}</div>
        <span class="count">${reviewCountLabel}</span>
      </div>
    </div>
  </div>

  ${existing.length > 0 ? `<div class="reviews-section">${reviewCards}</div>` : ''}

  <div class="card">
    <h2>Leave a review</h2>
    <form id="form">
      <input type="hidden" id="userId" value="${userId}">
      <div class="field"><label>Your name</label><input type="text" id="customerName" value="${customer ? customer.replace(/"/g, '&quot;') : ''}" placeholder="Jane Smith" required></div>
      <div class="field">
        <label>Rating</label>
        <div class="stars-input" id="starsInput" role="group" aria-label="Rating">
          ${[1,2,3,4,5].map(i => `<button type="button" class="star-btn" data-val="${i}" aria-label="${i} star">${starSvg(i <= 5)}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Your review</label><textarea id="reviewText" rows="4" placeholder="Share what made the experience great..." required></textarea></div>
      <button type="submit" id="btn">Submit review</button>
      <div id="msg" class="msg" style="display:none;"></div>
    </form>
  </div>
  <p class="powered">Powered by Invoice Be Beta</p>
</div>
<script>
let rating = 5;
const stars = document.querySelectorAll('.star-btn');
function updateStars(val) {
  rating = val;
  stars.forEach((btn, i) => {
    const filled = i < val;
    const color = filled ? '#f59e0b' : '#e5e7eb';
    btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="'+color+'" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  });
}
updateStars(5);
stars.forEach(btn => btn.addEventListener('click', () => updateStars(Number(btn.dataset.val))));
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  const name = document.getElementById('customerName').value.trim();
  const text = document.getElementById('reviewText').value.trim();
  if (!name || !text) { msg.className='msg err'; msg.textContent='Please fill in your name and review.'; msg.style.display='block'; return; }
  btn.disabled = true; btn.textContent = 'Submitting…';
  const userId = document.getElementById('userId').value;
  const res = await fetch('/api/review/' + userId, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ customerName: name, rating, text, invoiceRef: ${ref ? `'${ref}'` : 'null'} })
  });
  const data = await res.json();
  if (data.ok) {
    document.getElementById('form').innerHTML = '<div style="text-align:center;padding:16px;"><div style="font-size:32px;margin-bottom:12px;">&#127775;</div><p style="font-size:16px;font-weight:600;color:#1f2937;margin-bottom:6px;">Thank you!</p><p style="color:#6b7280;font-size:14px;">Your review has been submitted.</p></div>';
  } else {
    msg.className='msg err'; msg.textContent=data.error||'Something went wrong.';
    msg.style.display='block'; btn.disabled=false; btn.textContent='Submit review';
  }
});
</script>
</body>
</html>`);
});

router.post('/review/:userId', async (req, res) => {
  const { userId } = req.params;
  const { customerName, rating, text, invoiceRef } = req.body ?? {};

  if (!rating || !text || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating (1–5) and review text are required' });
  }
  if (!text.trim()) return res.status(400).json({ error: 'Review text is required' });

  const id = 'rv_' + Date.now().toString() + crypto.randomBytes(4).toString('hex');
  await insertReview(id, userId, customerName || null, invoiceRef || null, Number(rating), text.trim());

  logger.info({ userId, id }, 'Review submitted');
  res.json({ ok: true, id });
});

router.get('/review/:userId/list', async (req, res) => {
  const { userId } = req.params;
  const reviews = await getReviewsByUserId(userId);
  res.json({ ok: true, reviews });
});

export default router;
