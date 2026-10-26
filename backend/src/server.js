// Entry point: picks a data store, starts the server, and shuts down cleanly.

const config = require('./config');
const { createApp } = require('./app');
const { createMemoryStore } = require('./store/memoryStore');
const { createPostgresStore } = require('./store/postgresStore');

async function main() {
  const store = config.databaseUrl
    ? createPostgresStore(config.databaseUrl)
    : createMemoryStore();

  // Retry the database connection a few times. When containers start together
  // (Docker Compose, Kubernetes), the database is often not ready on the first try.
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await store.init();
      break;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error('Could not connect to the database. Giving up.', err.message);
        process.exit(1);
      }
      console.log(`Database not ready (attempt ${attempt}/${maxAttempts}), retrying in 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const app = createApp({ store, config });
  const server = app.listen(config.port, () => {
    console.log(
      `journey-log API v${config.appVersion} listening on port ${config.port} (store: ${store.kind}, env: ${config.environment})`
    );
  });

  // Graceful shutdown: Docker and Kubernetes send SIGTERM before stopping a container.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
