const express = require('express');
const cors = require('cors');
const { syncDatabase } = require('../config/database');

const authRoutes = require('../routes/auth');
const projectRoutes = require('../routes/projects');
const taskRoutes = require('../routes/tasks');
const dashboardRoutes = require('../routes/dashboard');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let dbInitPromise = null;
app.use(async (req, res, next) => {
  try {
    if (!dbInitPromise) {
      dbInitPromise = syncDatabase();
    }
    await dbInitPromise;
    next();
  } catch (err) {
    console.error('Failed to sync database:', err);
    res.status(500).json({ error: 'Database initialization error' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled serverless error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
