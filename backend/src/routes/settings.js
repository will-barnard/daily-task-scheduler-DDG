const express = require('express');
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { sendTestEmail } = require('../services/email');
const { scheduleFromSettings } = require('../services/scheduler');

const router = express.Router();

// Get all settings
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

// Update recipients (any authenticated user)
router.put('/recipients', authenticate, (req, res) => {
  const { recipients } = req.body;
  if (!Array.isArray(recipients)) {
    return res.status(400).json({ error: 'Recipients must be an array of emails' });
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'recipients',
    JSON.stringify(recipients)
  );
  res.json({ message: 'Recipients updated' });
});

// Update send time (super admin only)
router.put('/send-time', authenticate, requireSuperAdmin, (req, res) => {
  const { time } = req.body;
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Time must be in HH:MM format' });
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('send_time', time);
  scheduleFromSettings();
  res.json({ message: 'Send time updated' });
});

// Send test email
router.post('/test-email', authenticate, (req, res) => {
  const recipientsSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('recipients');
  const recipients = recipientsSetting ? JSON.parse(recipientsSetting.value) : [];

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients configured. Add recipients first.' });
  }

  sendTestEmail(recipients)
    .then(() => res.json({ message: 'Test email sent successfully' }))
    .catch((err) => res.status(500).json({ error: 'Failed to send test email: ' + err.message }));
});

module.exports = router;
