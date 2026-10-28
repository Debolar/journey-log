// Automated tests for the API. Run with: npm test
// Your CI pipeline will run these on every push and pull request.

const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStore } = require('../src/store/memoryStore');

const config = { appVersion: 'test', environment: 'test', frontendDir: '' };

let app;

beforeEach(() => {
  // A fresh in-memory store for every test, so tests do not affect each other.
  app = createApp({ store: createMemoryStore(), config });
});

describe('health checks', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('broken');
  });

  test('GET /ready reports the store type', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.store).toBe('memory');
  });

  test('GET /ready returns 503 when the store is down', async () => {
    const brokenStore = createMemoryStore();
    brokenStore.ping = async () => {
      throw new Error('database unreachable');
    };
    const brokenApp = createApp({ store: brokenStore, config });
    const res = await request(brokenApp).get('/ready');
    expect(res.status).toBe(503);
  });
});

describe('info', () => {
  test('GET /api/info returns version and topics', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('test');
    expect(res.body.topics).toContain('docker');
  });
});

describe('entries', () => {
  test('starts empty', async () => {
    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('creates an entry', async () => {
    const res = await request(app)
      .post('/api/entries')
      .send({ title: 'Wrote my first Dockerfile', topic: 'docker', notes: 'Used node:20-alpine' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
    expect(res.body.completed).toBe(false);
  });

  test('rejects an entry with no title', async () => {
    const res = await request(app).post('/api/entries').send({ topic: 'git' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('title is required');
  });

  test('rejects an unknown topic', async () => {
    const res = await request(app).post('/api/entries').send({ title: 'x', topic: 'cooking' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid JSON', async () => {
    const res = await request(app)
      .post('/api/entries')
      .set('Content-Type', 'application/json')
      .send('{ not json');
    expect(res.status).toBe(400);
  });

  test('lists newest entries first', async () => {
    await request(app).post('/api/entries').send({ title: 'First', topic: 'linux' });
    await request(app).post('/api/entries').send({ title: 'Second', topic: 'git' });
    const res = await request(app).get('/api/entries');
    expect(res.body.map((e) => e.title)).toEqual(['Second', 'First']);
  });

  test('marks an entry as completed', async () => {
    await request(app).post('/api/entries').send({ title: 'Learn branches', topic: 'git' });
    const res = await request(app).patch('/api/entries/1').send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  test('returns 404 for a missing entry', async () => {
    const res = await request(app).get('/api/entries/999');
    expect(res.status).toBe(404);
  });

  test('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/entries/abc');
    expect(res.status).toBe(400);
  });

  test('deletes an entry', async () => {
    await request(app).post('/api/entries').send({ title: 'Temp', topic: 'other' });
    const del = await request(app).delete('/api/entries/1');
    expect(del.status).toBe(204);
    const after = await request(app).get('/api/entries/1');
    expect(after.status).toBe(404);
  });
});

describe('stats', () => {
  test('counts entries by topic and completion', async () => {
    await request(app).post('/api/entries').send({ title: 'A', topic: 'git' });
    await request(app).post('/api/entries').send({ title: 'B', topic: 'git' });
    await request(app).post('/api/entries').send({ title: 'C', topic: 'docker' });
    await request(app).patch('/api/entries/1').send({ completed: true });

    const res = await request(app).get('/api/stats');
    expect(res.body).toEqual({ total: 3, completed: 1, byTopic: { git: 2, docker: 1 } });
  });
});
