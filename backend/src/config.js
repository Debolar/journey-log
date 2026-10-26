// All settings come from environment variables, so the same code can run
// on a laptop, in Docker, in a pipeline, or in Kubernetes without changes.
// This is the "config in the environment" rule from the Twelve-Factor App.

const config = {
  port: Number(process.env.PORT) || 3000,
  // When DATABASE_URL is set, the app uses PostgreSQL.
  // When it is not set, it falls back to an in-memory store (data is lost on restart).
  databaseUrl: process.env.DATABASE_URL || '',
  // Shown by the /api/info endpoint so you can see which version is deployed.
  appVersion: process.env.APP_VERSION || 'dev',
  environment: process.env.APP_ENV || 'local',
  // Optional: folder of frontend files to serve from the backend during local development.
  frontendDir: process.env.FRONTEND_DIR || '',
};

module.exports = config;
