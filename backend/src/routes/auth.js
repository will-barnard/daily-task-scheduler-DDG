const express = require('express');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Get current user (from brew_token cookie, verified by middleware)
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

module.exports = router;
