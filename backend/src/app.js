// Builds the Express app. Kept separate from server.js so tests can load
// the app without opening a real network port.

const express = require('express');
const path = require('path');
const fs = require('fs');

const TOPICS = [
  'linux',
  'bash',
  'git',
  'docker',
  'ci-cd',
  'cloud',
  'terraform',
  'kubernetes',
  'monitoring',
  'other',
];

function validateEntry(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  if (body.title !== undefined || !partial) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.push('title is required');
    else if (title.length > 200) errors.push('title must be 200 characters or fewer');
    else clean.title = title;
  }

  if (body.topic !== undefined || !partial) {
    if (!TOPICS.includes(body.topic)) errors.push(`topic must be one of: ${TOPICS.join(', ')}`);
    else clean.topic = body.topic;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') errors.push('notes must be text');
    else clean.notes = body.notes.trim();
  } else if (!partial) {
    clean.notes = '';
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') errors.push('completed must be true or false');
    else clean.completed = body.completed;
  }

  return { errors, clean };
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function createApp({ store, config }) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Simple request log: one line per request, written to stdout.
  // Containers and Kubernetes collect stdout, so this is where your logs go.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  // ---- Health checks: used by Docker, Kubernetes, load balancers and smoke tests ----

  // Liveness: is the process running?
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Readiness: can the app actually serve traffic (is the database reachable)?
  app.get('/ready', async (req, res) => {
    try {
      await store.ping();
      res.json({ status: 'ready', store: store.kind });
    } catch (err) {
      res.status(503).json({ status: 'not ready', error: err.message });
    }
  });

  // ---- API ----

  app.get('/api/info', (req, res) => {
    res.json({
      app: 'journey-log',
      version: config.appVersion,
      environment: config.environment,
      store: store.kind,
      topics: TOPICS,
    });
  });

  app.get('/api/entries', async (req, res, next) => {
    try {
      res.json(await store.list());
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/entries/:id', async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'invalid id' });
      const entry = await store.get(id);
      if (!entry) return res.status(404).json({ error: 'entry not found' });
      res.json(entry);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/entries', async (req, res, next) => {
    try {
      const { errors, clean } = validateEntry(req.body || {});
      if (errors.length) return res.status(400).json({ errors });
      res.status(201).json(await store.create(clean));
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/entries/:id', async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'invalid id' });
      const { errors, clean } = validateEntry(req.body || {}, { partial: true });
      if (errors.length) return res.status(400).json({ errors });
      const entry = await store.update(id, clean);
      if (!entry) return res.status(404).json({ error: 'entry not found' });
      res.json(entry);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/entries/:id', async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'invalid id' });
      const removed = await store.remove(id);
      if (!removed) return res.status(404).json({ error: 'entry not found' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/stats', async (req, res, next) => {
    try {
      res.json(await store.stats());
    } catch (err) {
      next(err);
    }
  });

  // Optional: serve the frontend from the backend for simple local development.
  // In the capstone, the frontend gets its own container (Nginx) instead.
  if (config.frontendDir && fs.existsSync(config.frontendDir)) {
    app.use(express.static(path.resolve(config.frontendDir)));
  }

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'request body is not valid JSON' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp, TOPICS };
