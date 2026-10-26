// PostgreSQL store: used when DATABASE_URL is set.
// Example: postgres://journey:journey@localhost:5432/journeylog

const { Pool } = require('pg');

function createPostgresStore(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    kind: 'postgres',

    // Creates the table if it does not exist yet. db/init.sql does the same
    // thing, so either the app or the database container can set it up.
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS entries (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          topic VARCHAR(50) NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    },

    async ping() {
      await pool.query('SELECT 1');
      return true;
    },

    async list() {
      const { rows } = await pool.query('SELECT * FROM entries ORDER BY id DESC');
      return rows;
    },

    async get(id) {
      const { rows } = await pool.query('SELECT * FROM entries WHERE id = $1', [id]);
      return rows[0] || null;
    },

    async create({ title, topic, notes }) {
      const { rows } = await pool.query(
        'INSERT INTO entries (title, topic, notes) VALUES ($1, $2, $3) RETURNING *',
        [title, topic, notes]
      );
      return rows[0];
    },

    async update(id, changes) {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(changes)) {
        values.push(value);
        fields.push(`${key} = $${values.length}`);
      }
      if (fields.length === 0) return this.get(id);
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE entries SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return rows[0] || null;
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM entries WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async stats() {
      const totals = await pool.query(
        'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE completed)::int AS completed FROM entries'
      );
      const topics = await pool.query(
        'SELECT topic, COUNT(*)::int AS count FROM entries GROUP BY topic'
      );
      const byTopic = {};
      for (const row of topics.rows) byTopic[row.topic] = row.count;
      return { ...totals.rows[0], byTopic };
    },

    async close() {
      await pool.end();
    },
  };
}

module.exports = { createPostgresStore };
