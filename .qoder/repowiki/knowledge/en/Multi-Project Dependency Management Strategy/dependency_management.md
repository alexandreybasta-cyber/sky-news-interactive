This repository employs a polyrepo-style monorepo structure with three distinct projects, each managing dependencies independently using ecosystem-standard tools. There is no centralized dependency management or workspace orchestration (e.g., npm workspaces, yarn workspaces, or pnpm).

### 1. Backend: Python (pip + requirements.txt)
- **Package Manager**: `pip` via `requirements.txt`.
- **Versioning Strategy**: Strict pinning (`==`) for all dependencies to ensure reproducibility. Key packages include `fastapi==0.115.0`, `uvicorn[standard]==0.30.0`, and `openai==1.82.0`.
- **Virtual Environment**: A local `venv/` directory exists in `backend/`, indicating standard Python virtual environment usage. This directory is typically excluded from version control (though not explicitly checked in `.gitignore` at the root, it's a standard convention).
- **Configuration**: Dependencies are loaded via `pydantic-settings` which reads from a root-level `.env` file.

### 2. Frontend: Next.js (npm + package-lock.json)
- **Package Manager**: `npm` (inferred from `package-lock.json` with `lockfileVersion: 3`).
- **Versioning Strategy**: 
  - Core framework (`next`, `react`, `react-dom`) uses exact versions (e.g., `"next": "16.2.9"`).
  - Dev dependencies and utilities use caret ranges (e.g., `"tailwindcss": "^4"`, `"eslint": "^9"`), allowing minor/patch updates.
- **Lockfile**: `package-lock.json` is committed, ensuring deterministic installs across environments.
- **Dependencies**: Minimal runtime dependencies focused on React and Next.js. Styling via Tailwind CSS v4.

### 3. Sky News Planner: Next.js + Prisma (npm + package-lock.json)
- **Package Manager**: `npm` (same as frontend, separate `package-lock.json`).
- **Versioning Strategy**: Mixed strategy similar to the frontend. Core frameworks pinned, utilities using carets.
- **Database Dependencies**: Uses `prisma` (^5.22.0) and `@prisma/client` (^5.22.0) for ORM and schema management.
- **Schema Management**: Prisma schema (`schema.prisma`) defines the data model. Migrations are tracked in `prisma/migrations/` with a `migration_lock.toml` to prevent concurrent migration issues.
- **Seed Data**: Configured in `package.json` under `prisma.seed`, using `ts-node` to execute `prisma/seed.ts`.

### Key Conventions & Rules
1. **No Shared Dependencies**: Each project maintains its own `node_modules` or `venv`. There is no hoisting or shared library mechanism.
2. **Lockfile Commitment**: Both Next.js projects commit their `package-lock.json` files to ensure build consistency.
3. **Environment Isolation**: Each project relies on local environment files (`.env`, `.env.local`, `.env.example`) for configuration, decoupling secrets from dependency manifests.
4. **Strict Backend Pinning**: The Python backend prefers strict version equality (`==`) over ranges, prioritizing stability over automatic updates.
5. **Prisma Migration Locking**: The planner app uses Prisma's migration lock file to coordinate database schema changes, ensuring that only one migration process runs at a time.