const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get tasks for a specific date (used by the roundup page)
router.get('/by-date/:date', authenticate, (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
  }
  const tasks = db.prepare('SELECT * FROM tasks WHERE send_date = ? ORDER BY created_at ASC').all(date);
  res.json(tasks);
});

// Toggle done status
router.patch('/:id/done', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const done = req.body.done ? 1 : 0;
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(done, req.params.id);
  res.json({ id: task.id, done });
});

// Get all tasks
router.get('/', authenticate, (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, u.name as created_by_name 
    FROM tasks t 
    JOIN users u ON t.created_by = u.id 
    ORDER BY t.send_date ASC
  `).all();
  res.json(tasks);
});

// Create a task
router.post('/', authenticate, (req, res) => {
  const { title, description, send_date } = req.body;
  if (!title || !send_date) {
    return res.status(400).json({ error: 'Title and send date are required' });
  }

  const result = db.prepare(
    'INSERT INTO tasks (title, description, send_date, created_by) VALUES (?, ?, ?, ?)'
  ).run(title, description || '', send_date, req.user.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// Update a task
router.put('/:id', authenticate, (req, res) => {
  const { title, description, send_date } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('UPDATE tasks SET title = ?, description = ?, send_date = ? WHERE id = ?').run(
    title || task.title,
    description !== undefined ? description : task.description,
    send_date || task.send_date,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete a task
router.delete('/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
