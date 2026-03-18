const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// Shopify Flow sends the secret in the X-Webhook-Secret header.
// Set SHOPIFY_WEBHOOK_SECRET in your .env / Beachhead global env vars.
// If unset, verification is skipped (useful while testing).
function verifySecret(req) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return true;

  const provided = req.get('X-Webhook-Secret');
  if (!provided) return false;

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

// Shopify Flow HTTP action endpoint.
// Configure your Flow action to POST to: /webhooks/shopify
// Add header:  X-Webhook-Secret: <your secret>
// Body (JSON): { "product_name": "...", "edit_url": "..." }
router.post('/shopify', (req, res) => {
  if (!verifySecret(req)) {
    console.warn('[Shopify Flow] Invalid or missing X-Webhook-Secret — request rejected');
    return res.status(401).json({ error: 'Invalid secret' });
  }

  const payload = req.body;

  // Still logging raw JSON so you can verify the shape coming from Flow
  console.log('[Shopify Flow] Incoming payload:');
  console.log(JSON.stringify(payload, null, 2));

  const { product_name, product_url, product_id, condition } = payload;

  if (!product_name) {
    console.warn('[Shopify Flow] Missing product_name in payload');
    return res.status(400).json({ error: 'product_name is required' });
  }

  db.prepare(
    'INSERT INTO inbox_items (product_name, product_url, product_id, condition) VALUES (?, ?, ?, ?)'
  ).run(product_name, product_url || null, product_id || null, condition || null);

  console.log(`[Shopify Flow] Added "${product_name}" to inbox (condition: ${condition || 'N/A'})`);
  res.status(200).json({ received: true });
});

module.exports = router;
