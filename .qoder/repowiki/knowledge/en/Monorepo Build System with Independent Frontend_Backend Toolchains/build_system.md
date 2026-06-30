## Build System Overview

The Sky News Interactive System uses a monorepo structure with three independent sub-projects, each managed by its own language-specific toolchain. There is no unified build orchestration (no Makefile, no Dockerfiles, no CI/CD pipelines).

### Architecture

The repository contains three loosely-coupled components:

1. **backend/** - Python FastAPI service
2. **frontend/** - Next.js display application
3. **sky-news-planner/** - Next.js planning dashboard with Prisma ORM

Each component operates independently with its own dependency management and build scripts. There is no root-level build script coordinating all three.

---

### Backend (Python/FastAPI)

**Dependency Management:** `requirements.txt` with pinned versions
- Key dependencies: fastapi==0.115.0, uvicorn[standard]==0.30.0, openai==1.82.0
- Uses a local virtual environment (venv/ directory present but not committed)

**Build and Run:**
- No dedicated build step as Python is interpreted
- Development server: uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) in main.py
- Standard invocation: pip install -r requirements.txt and python main.py

No containerization or packaging configuration found.

---

### Frontend (Next.js)

**Dependency Management:** package.json plus package-lock.json
- Framework: Next.js 16.2.9, React 19.2.4
- Styling: Tailwind CSS v4
- Linting: ESLint v9 with eslint-config-next

**Build Scripts:**
- dev: next dev
- build: next build
- start: next start
- lint: eslint

**Configuration:** Minimal next.config.ts with default settings. No custom webpack, rewrites, or output configuration.

---

### Sky News Planner (Next.js + Prisma)

**Dependency Management:** package.json plus package-lock.json
- Same Next.js/React stack as frontend
- Additional: Prisma ORM (@prisma/client, prisma), NextAuth v4, bcryptjs, shadcn/ui components

**Build Scripts:**
- dev: next dev
- build: next build
- start: next start
- lint: eslint

**Database Setup:**
- Prisma schema at prisma/schema.prisma using SQLite (dev.db)
- Seed script configured: ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts
- Migration history present in prisma/migrations/
- No npm scripts for prisma generate or prisma migrate - these must be run manually

---

### Deployment and CI/CD

**No CI/CD configuration exists:**
- No .github/workflows/ directory
- No GitLab CI, Jenkins, or other pipeline configs
- No Dockerfiles or docker-compose files
- No Makefile for task automation

**Deployment Guidance:** Both Next.js READMEs reference Vercel as the recommended deployment platform, but no vercel.json or deployment hooks are configured.

**Custom Push Script:** push-via-api.sh is a bash script that pushes the entire repository to GitHub via the REST API (not git remote). It reads a PAT from .github-token, creates blobs for every tracked file, builds a tree and commit object, and updates the branch ref. This is an unconventional deployment/push mechanism, likely used when direct git push is unavailable. It does not build or test anything - it only transfers files.

---

### Developer Conventions and Rules

1. **Independent development:** Each sub-project must be started separately. There is no root-level npm run dev or make dev that launches all services.

2. **Environment variables:** Each project uses its own .env / .env.local files. Root-level .env.example exists but sub-projects have their own copies.

3. **No shared build commands:** Developers must navigate into each directory and run toolchain-specific commands:
   - Backend: pip install -r requirements.txt and python main.py
   - Frontend: npm install and npm run dev
   - Planner: npm install and npx prisma generate and npx prisma migrate dev and npm run dev

4. **No version coordination:** All packages use 0.1.0 or similar placeholder versions. No release tagging strategy evident.

5. **Manual database operations:** Prisma migrations and seeding must be invoked manually - no npm scripts wrap these commands.

6. **No testing framework configured:** No test scripts, no Jest/Vitest/pytest configurations found across any sub-project.