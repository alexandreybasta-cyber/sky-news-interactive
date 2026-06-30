## Overview

The Sky News Interactive System uses a **decentralized, environment-variable-driven configuration approach** across three distinct sub-projects (backend FastAPI app, frontend Next.js display, and sky-news-planner Next.js dashboard). There is no centralized configuration framework — each project independently loads its own `.env` files using framework-native or library-based mechanisms.

---

## Configuration Approach by Project

### Backend (FastAPI + pydantic-settings)

The backend uses **pydantic-settings** (`BaseSettings`) to load configuration from a root-level `.env` file:

- **Core file**: `backend/config.py`
- **Mechanism**: A `Settings` class inherits from `BaseSettings`, declaring typed fields with defaults. The `Config` inner class specifies `env_file` pointing to the repository root's `.env` file (one directory up from `backend/`).
- **Caching**: Settings are cached via `@lru_cache()` through a `get_settings()` function, ensuring a single instance is reused.
- **Consumption**: Services import `settings` directly from `config` (e.g., `backend/services/news_engine.py` reads `settings.DASHSCOPE_API_KEY`, `settings.DASHSCOPE_BASE_URL`, `settings.MODEL_TEXT`).
- **Key settings**: API credentials (`DASHSCOPE_API_KEY`), model selection (`MODEL_TEXT`), server URLs (`BASE_URL`, `WS_URL`).

### Frontend (Next.js environment variables)

The frontend relies on **Next.js built-in environment variable handling**:

- **Core file**: `frontend/.env.local`
- **Mechanism**: Standard Next.js convention — `.env.local` is automatically loaded at build/runtime. Variables prefixed with `NEXT_PUBLIC_` are exposed to client-side code.
- **Usage**: Client-side modules (e.g., `frontend/src/lib/websocket.ts`) reference `process.env.NEXT_PUBLIC_WS_URL` and `process.env.NEXT_PUBLIC_API_URL`.
- **No custom config loader**: The `next.config.ts` is minimal with no custom env mapping.

### Sky News Planner (Next.js + Prisma + NextAuth)

The planner sub-project also uses **Next.js environment variables**, plus **Prisma's env() function** for database configuration:

- **Core file**: `sky-news-planner/.env` (with `.env.example` as template)
- **Mechanism**: 
  - Next.js loads `.env` automatically for server-side vars (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TEAMS_WEBHOOK_URL`).
  - Prisma schema (`prisma/schema.prisma`) uses `env("DATABASE_URL")` to read the SQLite connection string.
  - NextAuth reads `process.env.NEXTAUTH_SECRET` in `src/lib/auth.ts`.
- **Key settings**: Database URL, authentication secret, auth base URL, Teams webhook URL.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/config.py` | Pydantic-settings based config loader for backend |
| `.env` / `.env.example` | Root-level environment file shared by backend; template for all projects |
| `frontend/.env.local` | Frontend-specific environment overrides |
| `sky-news-planner/.env` / `.env.example` | Planner-specific environment file |
| `sky-news-planner/prisma/schema.prisma` | Prisma datasource config referencing `DATABASE_URL` env var |
| `sky-news-planner/src/lib/auth.ts` | NextAuth config reading `NEXTAUTH_SECRET` from env |

---

## Architecture and Conventions

1. **Decentralized loading**: Each sub-project manages its own environment file. The root `.env` serves the backend; frontend and planner have their own `.env` / `.env.local` files.
2. **Template-driven setup**: `.env.example` files exist at both root and planner levels to document required variables without exposing secrets.
3. **Typed backend config**: The backend benefits from pydantic's type validation and default values, providing compile-time safety.
4. **Frontend env prefixing**: Client-exposed variables follow Next.js convention (`NEXT_PUBLIC_` prefix).
5. **No runtime config overrides**: There is no mechanism for dynamic config reloading or feature flags — all configuration is static at process start.
6. **Secrets in .env**: Sensitive values (API keys, auth secrets) are stored directly in `.env` files, relying on `.gitignore` for protection.

---

## Rules for Developers

1. **Never commit `.env` files**: All `.env` files should be gitignored. Use `.env.example` as the source of truth for required variables.
2. **Backend: use `settings` singleton**: Always import `settings` from `backend/config.py` rather than accessing `os.environ` directly. This ensures consistency and leverages pydantic validation.
3. **Frontend: prefix client vars with `NEXT_PUBLIC_`**: Any environment variable needed in browser code must use this prefix; otherwise it will be undefined at runtime.
4. **Add new env vars to `.env.example`**: When introducing new configuration, update the corresponding `.env.example` file to document the variable for other developers.
5. **Keep backend `.env` at repo root**: The backend's `config.py` explicitly points to `../.env` relative to the backend directory. Do not move the root `.env` file without updating this path.
6. **Planner: sync Prisma and NextAuth env vars**: Ensure `DATABASE_URL` in `.env` matches the Prisma schema expectation, and `NEXTAUTH_SECRET` is set before running auth-dependent features.