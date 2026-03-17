const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
