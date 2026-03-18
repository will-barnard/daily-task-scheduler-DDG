require('dotenv/config');
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const settingsRoutes = require('./routes/settings');
const inboxRoutes = require('./routes/inbox');
const webhookRoutes = require('./routes/webhooks');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Webhooks — no auth middleware, secret verified inside the handler
app.use('/webhooks', webhookRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/inbox', inboxRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Start scheduler
startScheduler();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
