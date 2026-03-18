const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Shopify sends HMAC-SHA256 of the raw body in X-Shopify-Hmac-Sha256 (base64).
// Set SHOPIFY_WEBHOOK_SECRET in your .env to enable verification.
// While iterating, leave it unset to skip verification and just log payloads.
function verifyShopifyHmac(req) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return true; // verification disabled

  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.body) // req.body is a Buffer when using express.raw()
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

// Single handler for all Shopify webhook topics.
// Point your Shopify webhooks at:  POST /webhooks/shopify
router.post('/shopify', express.raw({ type: 'application/json' }), (req, res) => {
  if (!verifyShopifyHmac(req)) {
    console.warn('[Shopify Webhook] Invalid HMAC signature — request rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const topic = req.get('X-Shopify-Topic') || 'unknown';
  const shop = req.get('X-Shopify-Shop-Domain') || 'unknown';

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    console.error('[Shopify Webhook] Failed to parse JSON body');
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log(`[Shopify Webhook] topic=${topic} shop=${shop}`);
  console.log(JSON.stringify(payload, null, 2));

  // Shopify requires a 200 response quickly or it will retry
  res.status(200).json({ received: true });
});

module.exports = router;
