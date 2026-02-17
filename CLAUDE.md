# Exeflow

Autonomous vibecoding platform — idea to product with orchestrated Claude Code agents.

## Architecture

- **Frontend**: Next.js 15 (App Router), React 19, shadcn/ui, Tailwind CSS, framer-motion
- **Visualization**: @xyflow/react (agent trees, plan DAGs), @dnd-kit (kanban), recharts
- **Backend**: Next.js API routes, SQLite (better-sqlite3)
- **Engine**: Claude Agent SDK for spawning autonomous agent sessions
- **State**: zustand (client), @tanstack/react-query (server state)

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (localhost:3000) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run vitest |

## Project Structure

- `src/app/` — Next.js pages and API routes
- `src/lib/` — Core logic (db, engine, research, connections, claude, etc.)
- `src/components/` — React components (ui/, layout/, chat/, dashboard/, etc.)
- `src/types/` — TypeScript type definitions
- `agent-prompts/` — Orchestration prompt templates for agent phases
- `bin/` — CLI entry point
- `data/` — Runtime data (gitignored, created at ~/.exeflow/)

## Coding Standards

- TypeScript strict mode
- Use `path.join()` / `path.resolve()` for all file paths — never string concatenation
- Use `os.homedir()` for home directory — never `~` or `process.env.HOME`
- All database writes use transactions with retry logic
- Follow existing component patterns (shadcn/ui primitives)
- No hardcoded secrets — use environment variables
- Use `@/` import alias for src/ imports
