const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Create invite link (super admin only)
router.post('/invite', authenticate, requireSuperAdmin, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'User with this email already exists' });

  const token = uuidv4();
  db.prepare('INSERT INTO invite_tokens (token, email, created_by) VALUES (?, ?, ?)').run(
    token,
    email,
    req.user.id
  );

  const link = `${process.env.FRONTEND_URL}/signup?token=${token}`;
  res.json({ link, token });
});

// Validate invite token
router.get('/invite/:token', (req, res) => {
  const invite = db.prepare('SELECT * FROM invite_tokens WHERE token = ? AND used = 0').get(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
  res.json({ email: invite.email });
});

// Register via invite token
router.post('/register', (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password) {
    return res.status(400).json({ error: 'Token, name, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const invite = db.prepare('SELECT * FROM invite_tokens WHERE token = ? AND used = 0').get(token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
    invite.email,
    hash,
    name,
    'user'
  );

  db.prepare('UPDATE invite_tokens SET used = 1 WHERE id = ?').run(invite.id);

  res.json({ message: 'Account created successfully' });
});

// List users (super admin only)
router.get('/users', authenticate, requireSuperAdmin, (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users').all();
  res.json(users);
});

module.exports = router;
