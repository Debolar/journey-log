// In-memory store: used for automated tests and quick local runs.
// Data disappears when the process stops, which is exactly why real
// deployments need a database (and why containers need volumes).

function createMemoryStore() {
  let entries = [];
  let nextId = 1;

  return {
    kind: 'memory',

    async init() {},

    async ping() {
      return true;
    },

    async list() {
      return [...entries].sort((a, b) => b.id - a.id);
    },

    async get(id) {
      return entries.find((e) => e.id === id) || null;
    },

    async create({ title, topic, notes }) {
      const entry = {
        id: nextId++,
        title,
        topic,
        notes,
        completed: false,
        created_at: new Date().toISOString(),
      };
      entries.push(entry);
      return entry;
    },

    async update(id, changes) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return null;
      Object.assign(entry, changes);
      return entry;
    },

    async remove(id) {
      const before = entries.length;
      entries = entries.filter((e) => e.id !== id);
      return entries.length < before;
    },

    async stats() {
      const byTopic = {};
      for (const e of entries) {
        byTopic[e.topic] = (byTopic[e.topic] || 0) + 1;
      }
      return {
        total: entries.length,
        completed: entries.filter((e) => e.completed).length,
        byTopic,
      };
    },

    async close() {},
  };
}

module.exports = { createMemoryStore };
