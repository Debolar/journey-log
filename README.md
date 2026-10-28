# Journey Log

A small full-stack web app for logging what you learn. It is the base for a DevOps capstone project: the app code is done, and your job is to containerize it, build a CI/CD pipeline, provision infrastructure, deploy it, and monitor it.

```
┌──────────────┐   /api/*   ┌──────────────┐   SQL   ┌──────────────┐
│   Frontend   │ ─────────▶ │  Backend API │ ──────▶ │  PostgreSQL  │
│ HTML/CSS/JS  │            │ Node/Express │         │   database   │
└──────────────┘            └──────────────┘         └──────────────┘
```

## Project structure

```
journey-log/
├── frontend/              Static website (HTML, CSS, JavaScript)
│   ├── index.html
│   ├── styles.css
│   ├── app.js             Calls the API and renders entries
│   └── config.js          Where the frontend sends API requests
├── backend/               REST API (Node.js + Express)
│   ├── src/
│   │   ├── server.js      Entry point: starts the server, retries DB, graceful shutdown
│   │   ├── app.js         Routes, validation, health checks
│   │   ├── config.js      Reads settings from environment variables
│   │   └── store/         Data layer: in-memory (tests) or PostgreSQL (real)
│   ├── tests/             Automated API tests (Jest + Supertest)
│   ├── db/init.sql        Database table + starter rows
│   ├── eslint.config.js   Lint rules
│   └── package.json
├── .env.example           Example environment variables
└── .gitignore
```

## Run it locally (no Docker yet)

You need **Node.js 20 or newer**.

```bash
cd backend
npm install
npm test             # 15 tests should pass
npm run lint         # should print nothing (no problems)

# Start the API and serve the frontend from it (in-memory data):
FRONTEND_DIR=../frontend npm start
```

Open http://localhost:3000. Without a database, data is kept in memory and lost when you stop the app. That is on purpose: it is the problem your Docker volume and database will solve.

On Windows PowerShell, set the variable like this instead:

```powershell
$env:FRONTEND_DIR="../frontend"; npm start
```

## Configuration

All settings come from environment variables, so the same code runs anywhere.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the API listens on |
| `DATABASE_URL` | *(empty)* | PostgreSQL connection string. Empty = in-memory store |
| `APP_VERSION` | `dev` | Shown in the app footer. Set it from your pipeline (e.g. the Git commit SHA) |
| `APP_ENV` | `local` | Environment name shown in the footer (`local`, `staging`, `production`) |
| `FRONTEND_DIR` | *(empty)* | Folder of frontend files for the backend to serve (local dev only) |

Example: `DATABASE_URL=postgres://journey:journey@localhost:5432/journeylog`

## API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check: is the process running? Always `200` |
| GET | `/ready` | Readiness check: can it reach the database? `200` or `503` |
| GET | `/api/info` | Version, environment, store type, list of topics |
| GET | `/api/entries` | List all entries, newest first |
| POST | `/api/entries` | Create an entry: `{ "title", "topic", "notes" }` |
| GET | `/api/entries/:id` | Get one entry |
| PATCH | `/api/entries/:id` | Update fields, e.g. `{ "completed": true }` |
| DELETE | `/api/entries/:id` | Delete an entry |
| GET | `/api/stats` | Totals and count per topic |

Valid topics: `linux`, `bash`, `git`, `docker`, `ci-cd`, `cloud`, `terraform`, `kubernetes`, `monitoring`, `other`.

Try it with curl:

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/entries \
  -H "Content-Type: application/json" \
  -d '{"title":"Wrote a Dockerfile","topic":"docker"}'
```

---

# The capstone: your DevOps tasks

Work through these in order. Each milestone is one or more pull requests into `main`. Tick them off as you go; this checklist becomes part of your portfolio.

### Milestone 1: Git and GitHub
- [x] Create a GitHub repo, push this project, rename the default branch to `main`
- [x] Protect `main`: require pull requests, block direct pushes
- [x] From now on, every change goes through a branch and a PR

### Milestone 2: Docker
- [x] `backend/Dockerfile`: small base image (e.g. `node:20-alpine`), install only production dependencies (`npm ci --omit=dev`), run as a non-root user, expose port 3000
- [x] Add a `HEALTHCHECK` that calls `/health`
- [x] `frontend/Dockerfile`: serve the static files with Nginx
- [x] `frontend/nginx.conf`: serve the files, and forward `/api/` to the backend container
- [x] `docker-compose.yml` with three services: `frontend`, `backend`, `db` (`postgres:16`)
  - [x] Mount `backend/db/init.sql` into `/docker-entrypoint-initdb.d/` on the db container
  - [x] Use a named volume so data survives `docker compose down` and `up`
  - [x] Pass `DATABASE_URL` to the backend through environment variables
- [x] `docker compose up` → open the app → add an entry → restart → the entry is still there
- [x] Add a `.dockerignore` so `node_modules` is not copied into the image

### Milestone 3: CI with GitHub Actions
- [ ] On every pull request: install dependencies, run `npm run lint` and `npm test`
- [ ] Make the checks required in branch protection, so failing code cannot be merged
- [ ] On merge to `main`: build both images and push them to Docker Hub or GitHub Container Registry
- [ ] Tag images with the Git commit SHA, and pass it in as `APP_VERSION`
- [ ] Scan the images with Trivy and fail the pipeline on critical vulnerabilities
- [ ] Store registry credentials as GitHub Secrets, never in the code

### Milestone 4: Cloud and Terraform (AWS)
- [ ] Use Terraform to create the infrastructure: VPC, subnet, security group, and an EC2 instance (or a managed Kubernetes cluster later)
- [ ] Open only the ports you need
- [ ] Keep Terraform state in an S3 bucket
- [ ] `terraform plan` and `terraform apply` run cleanly; `terraform destroy` removes everything (important for your AWS bill)

### Milestone 5: Kubernetes
- [ ] Practise locally first with `minikube` or `kind`
- [ ] Manifests for: backend `Deployment` + `Service`, frontend `Deployment` + `Service`, PostgreSQL (`StatefulSet` with a `PersistentVolumeClaim`)
- [ ] Settings in a `ConfigMap`, the database password in a `Secret`
- [ ] `livenessProbe` → `/health`, `readinessProbe` → `/ready`
- [ ] Scale the backend to 3 replicas and confirm the app still works
- [ ] Expose the app with an `Ingress` (or a `NodePort` while learning)

### Milestone 6: Continuous deployment
- [ ] Extend the pipeline to deploy automatically after images are pushed
- [ ] Add a smoke test step: `curl` the `/health` endpoint after deploying, and fail the pipeline if it does not return `200`
- [ ] Check that the footer version matches the commit you just merged

### Milestone 7: Monitoring
- [ ] Install Prometheus and Grafana (the `kube-prometheus-stack` Helm chart is the common route)
- [ ] Build a Grafana dashboard for pod CPU, memory, and restarts
- [ ] Set up an alert for when the backend is down
- [ ] Stretch: add a `/metrics` endpoint to the API with the `prom-client` npm package

### Milestone 8: Write it up
- [ ] Update this README with an architecture diagram of your final setup
- [ ] Explain the choices you made and what you would improve
- [ ] Add screenshots: pipeline runs, Grafana dashboard, the running app

## Built-in DevOps features to notice

These are already in the code, because real apps need them and interviewers ask about them:

- **Config from environment variables** (`src/config.js`), so one image runs in every environment
- **Separate liveness and readiness checks** (`/health` and `/ready`), the two probe types Kubernetes uses
- **Database connection retries** on startup (`src/server.js`), because containers start in an unpredictable order
- **Graceful shutdown** on `SIGTERM`, which Docker and Kubernetes send before stopping a container
- **Logs to stdout**, one line per request, which is where container platforms collect logs
- **Input validation** and clear error codes (`400`, `404`, `503`)
