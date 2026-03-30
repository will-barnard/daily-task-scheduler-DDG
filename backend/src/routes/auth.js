const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/register', (req, res) => {
  const { name, email, password, token } = req.body;
  if (!name || !email || !password || !token) {
    return res.status(400).json({ error: 'Name, email, password and invite token are required' });
  }

  const invite = db.prepare('SELECT * FROM invite_tokens WHERE token = ? AND used = 0').get(token);
  if (!invite) return res.status(400).json({ error: 'Invalid or already-used invite token' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, hashed, 'user');

  db.prepare('UPDATE invite_tokens SET used = 1 WHERE token = ?').run(token);

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const jwtToken = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token: jwtToken, user });
});

router.post('/invite', authenticate, requireSuperAdmin, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = uuidv4();
  db.prepare('INSERT INTO invite_tokens (token, email) VALUES (?, ?)').run(token, email);

  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signup?token=${token}`;
  res.json({ link, token });
});

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

router.get('/users', authenticate, requireSuperAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

module.exports = router;
