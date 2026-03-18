const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// List all pending inbox items
router.get('/', authenticate, (req, res) => {
  const items = db.prepare('SELECT * FROM inbox_items ORDER BY received_at DESC').all();
  res.json(items);
});

// Dismiss (delete) an inbox item
router.delete('/:id', authenticate, (req, res) => {
  const item = db.prepare('SELECT id FROM inbox_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  db.prepare('DELETE FROM inbox_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item dismissed' });
});

// Approve an inbox item — creates a task and removes it from inbox
router.post('/:id/approve', authenticate, (req, res) => {
  const item = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { title, description, send_date } = req.body;
  if (!title || !send_date) {
    return res.status(400).json({ error: 'title and send_date are required' });
  }

  const result = db.prepare(
    'INSERT INTO tasks (title, description, send_date, product_url, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description || '', send_date, item.product_url || null, req.user.id);

  db.prepare('DELETE FROM inbox_items WHERE id = ?').run(req.params.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

module.exports = router;
