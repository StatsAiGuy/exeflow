# Exeflow

**Autonomous vibecoding platform** — describe your project idea, and exeflow handles everything: researching the optimal setup, configuring connections, orchestrating AI agents, and continuously building your project with minimal input.

```
Idea  -->  Research  -->  Plan  -->  Build  -->  Test  -->  Ship
            (auto)        (auto)     (auto)      (auto)     (auto)
```

## What is Exeflow?

Exeflow is a local web interface that turns project ideas into working software. It orchestrates Claude Code agents through an autonomous execution loop:

```
     ┌───────────────────────────────────────────┐
     │            EXECUTION LOOP                  │
     │                                            │
     │    Plan ──> Execute ──> Review ──> Test    │
     │     ^                              │       │
     │     └──────── Propose <────────────┘       │
     │                                            │
     │    Each cycle builds, tests, commits       │
     └───────────────────────────────────────────┘
```

**Who is it for?** Anyone with a project idea — developers and non-developers alike. All you need is a terminal, a Claude API key, and a GitHub account.

## Features

- **Project Dashboard** — Create projects from natural language descriptions. Track progress, agent activity, and execution status in real-time.
- **AI Research** — Claude researches the optimal tech stack, MCP connections, and model configuration for your project idea.
- **Autonomous Execution Loop** — Plan → Execute → Review → Test → Propose cycles run continuously. Each cycle produces tested, committed code.
- **Agent Orchestration** — Specialized agents (executor, reviewer, tester) with smart model delegation (Opus for complex tasks, Haiku for routine work).
- **Real-Time Visualization** — Execution loop pipeline, agent activity graphs, task boards, and live activity feeds.
- **Chat Interface** — Talk to the lead agent, approve checkpoints, or intervene at any time via the chat panel.
- **Code Viewer** — Browse the project workspace with a file tree and syntax-highlighted code viewer.
- **MCP Connections** — AI-recommended integrations (Supabase, Vercel, Stripe, etc.) installed and configured automatically.
- **Quality Gates** — TypeScript, lint, build, test, and security audit checks at every phase transition.
- **Discord & Slack Notifications** — Get notified about milestones, errors, and checkpoints. Approve from your phone via Discord bot.
- **Command Palette** — Cmd+K to search and navigate anywhere instantly.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    EXEFLOW WEB UI                          │
│                (Next.js on localhost:3000)                  │
│                                                            │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐ │
│  │Dashboard │  Plan    │  Agents  │   Code   │ Settings │ │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘ │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │           ORCHESTRATION ENGINE                     │    │
│  │  Lead agent ──> Sub-agents ──> Quality gates       │    │
│  └──────────────────────┬─────────────────────────────┘    │
│                         │                                   │
│  ┌──────────────────────┴─────────────────────────────┐    │
│  │  SQLite  │  Event Bus (SSE)  │  Notification Hub   │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────────┬────────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │    CLAUDE CODE ENGINE   │
               │   (Claude Agent SDK)    │
               └─────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, shadcn/ui, Tailwind CSS v4, framer-motion |
| Visualization | @xyflow/react, @dnd-kit, recharts |
| State | zustand (client), @tanstack/react-query (server) |
| Database | SQLite (better-sqlite3) with WAL mode |
| Engine | Claude Agent SDK |
| Notifications | Discord.js, Slack webhooks, SSE |
| CLI | commander, inquirer |

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm (recommended) or npm
- Claude API key
- Git

### Install & Run

```bash
git clone https://github.com/StatsAiGuy/exeflow.git
cd exeflow
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — the onboarding wizard will guide you through setup.

### First Launch

1. Enter your Claude API key
2. Allow machine specs gathering (CPU, RAM, OS)
3. Claude researches optimal setup for your machine
4. Connect GitHub (dedicated org + fine-grained PAT)
5. Optionally connect Discord/Slack for notifications

### Create a Project

1. Click "New Project" on the dashboard
2. Describe your idea in natural language
3. Claude researches the optimal stack and connections
4. Review and approve the generated plan
5. Click "Start" — the autonomous loop begins

## Project Structure

```
exeflow/
├── bin/cli.ts                    # CLI entry point
├── src/
│   ├── app/                      # Next.js pages (12 routes)
│   │   ├── api/                  # 26 API endpoints
│   │   ├── onboarding/           # First-launch wizard
│   │   ├── projects/             # Project dashboard & sub-pages
│   │   ├── connections/          # MCP connection browser
│   │   └── settings/             # Global settings
│   ├── components/               # 50+ UI components
│   │   ├── chat/                 # Chat panel, messages, checkpoints
│   │   ├── execution/            # Loop visualizer, phase nodes
│   │   ├── plan/                 # Plan tree, progress bars
│   │   ├── tasks/                # Task list, detail view
│   │   ├── agents/               # Agent list, model usage
│   │   ├── code/                 # File tree, code viewer
│   │   ├── approval/             # Approval queue
│   │   └── dashboard/            # Project cards, command palette
│   ├── lib/                      # 55+ library modules
│   │   ├── engine/               # Orchestrator, agent spawner, loop controller
│   │   ├── claude/               # SDK wrapper, schemas, MCP, permissions
│   │   ├── quality/              # Loop detection, churn, validators
│   │   ├── resilience/           # Circuit breaker, backoff
│   │   ├── research/             # Stack, connections, model research
│   │   ├── notifications/        # Discord, Slack, SSE router
│   │   └── config-gen/           # CLAUDE.md, settings, rules, skills gen
│   └── types/                    # TypeScript type definitions
└── agent-prompts/                # 7 orchestration prompt templates
```

## How the Execution Loop Works

Each project runs through autonomous cycles:

1. **Plan** — Lead agent picks the next task from the current milestone
2. **Execute** — Executor agent writes code (Opus for complex, Haiku for routine)
3. **Review** — Reviewer agent checks code quality (score 1-5, approve/reject)
4. **Test** — Tester agent runs TypeScript, lint, build, tests, security audit
5. **Propose** — Commits to git, pushes to GitHub, assesses milestone progress

The lead agent manages recovery: retries with adjusted approach on first failure, escalates model on second failure, replans on third failure.

## Configuration

All configuration lives in `~/.exeflow/`:

```
~/.exeflow/
├── config.json         # Machine specs, preferences
├── credentials.json    # Encrypted API keys and tokens
├── exeflow.db          # SQLite database
├── learning/           # Cross-project learning (by project type)
└── projects/           # Project workspaces
```

## Contributing

Contributions are welcome! This project is open source.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm build` to verify
5. Submit a pull request

## License

MIT
