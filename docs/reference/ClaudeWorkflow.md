Luke wants exeflow to be his go-to workspace for all vibe coding projects -- web apps, mobile apps, tools, research, and learning. He's new to vibe coding and wants an optimal setup that leverages Claude Code's full power: skills, MCP servers, CLAUDE.md files, agent teams, and workflows.
Current state: C:\Luke is empty. The machine has Node.js, npm, pnpm, Python, Git, VS Code, and GitHub CLI installed. Claude Code is configured with Puppeteer and Chrome DevTools MCP servers. No CLAUDE.md files exist anywhere.
Goal: A fully configured workspace with folder structure, global + workspace CLAUDE.md files, custom skills, MCP servers, permissions, and a clear workflow guide.

Phase 1: Foundation (folder structure, git, config files)
1.1 Create folder structure
C:\Luke\
  projects\
    web\              # Next.js, React web apps
    mobile\           # Expo / React Native apps
    tools\            # CLI tools, scrapers, utilities
    research\         # POCs, experiments, learning
    apis\             # Backend APIs, serverless functions
  templates\          # Reusable project starters
  docs\
    research\         # Research summaries from /research skill
  .gitignore
  CLAUDE.md           # Workspace-level instructions
1.2 Initialize git at C:\Luke

git init
Create .gitignore covering node_modules, .env, build outputs, OS files, .claude/debug, .claude/shell-snapshots

1.3 Create Global CLAUDE.md
File: C:\Users\lukem\.claude\CLAUDE.md
Personal preferences applied to ALL Claude Code sessions:

Identity: Luke Myers, GitHub: StatsAiGuy, Windows, VS Code
Languages: TypeScript, Python
Frameworks: Next.js (App Router), React, Expo
Package manager: pnpm (JS/TS), pip (Python)
Coding style: TypeScript strict, functional components, Tailwind CSS, async/await, named exports, early returns, const over let
Communication: direct, concise, show code over describing code
Defaults: Next.js 15+ for web, Expo for mobile, always init git
Git: imperative mood, lowercase, under 72 chars
Rules: keep it simple, don't over-engineer, verify changes work

1.4 Create Workspace CLAUDE.md
File: C:\Luke\CLAUDE.md
Workspace-specific context:

Folder structure map
How to start a new project (use /new-project)
Quick reference commands (create-next-app, create-expo-app, etc.)
Available custom skills listing
MCP servers available
Agent Teams usage patterns
Tips and natural language triggers ("vibe check", "ship it", etc.)


Phase 2: MCP Servers & Permissions
2.1 Add MCP servers to global settings
File: C:\Users\lukem\.claude\settings.json (merge into existing)
Add these alongside existing Puppeteer + Chrome DevTools:

Context7 (@upstash/context7-mcp) -- fetches live, current documentation for any library (React, Next.js, Tailwind, etc.). Eliminates hallucinated APIs. Highest-value addition.
Playwright (@playwright/mcp@latest) -- browser testing and automation, more capable than Puppeteer for testing running apps.

2.1b MCP Isolation Note
MCP servers are isolated per Claude Code session -- each session spawns its own instances. Running 2 apps simultaneously in 2 sessions is safe; they don't interfere.
Global vs Project MCP strategy:

Global (in ~/.claude/settings.json): Context7, Playwright, Puppeteer, Chrome DevTools -- useful everywhere
Project-level (in <project>/.claude/settings.json): Database MCPs (Supabase, Firebase), project-specific APIs -- only load in that project

This will be documented in the workspace CLAUDE.md so future sessions know the pattern.
2.2 Expand workspace permissions
File: C:\Luke\.claude\settings.local.json
Expand from just node --version / npm --version to cover common dev commands:

Bash(node:*), Bash(npm:*), Bash(pnpm:*), Bash(npx:*)
Bash(git:*), Bash(python:*), Bash(pip:*)
Bash(vercel:*), Bash(bun:*)


Phase 3: Custom Skills
3.1 /new-project skill
File: C:\Luke\.claude\skills\new-project\SKILL.md
Scaffolds a new project from an idea:

Asks: type (web/mobile/api/tool/research), description, tech preferences
Picks correct projects/ subdirectory
Runs appropriate CLI (create-next-app, create-expo-app, etc.)
Initializes git, creates project-level CLAUDE.md
Installs deps, starts dev server, verifies it works

3.2 /deploy skill
File: C:\Luke\.claude\skills\deploy\SKILL.md
Deploys the current project:

Pre-flight: check git status, run build
Detect deployment target (vercel.json, netlify.toml, firebase.json)
Run deploy command
Report live URL

3.3 /research skill
File: C:\Luke\.claude\skills\research\SKILL.md
Researches a topic and creates a summary:

Web search for current info
Creates markdown doc at C:\Luke\docs\research\<topic>.md
Presents concise verbal summary

3.4 /vibe-check skill
File: C:\Luke\.claude\skills\vibe-check\SKILL.md
Quick project health check:

Dependencies status (outdated, security)
Build status
Git status
CLAUDE.md existence/freshness
Code quality scan (TODOs, console.logs)
Reports: overall vibe, top 3 good things, top 3 improvements


Phase 4: Tool Installation
Install immediately
ToolCommandPurposeVercel CLIpnpm add -g vercelDeploy web appsSupabase CLIpnpm add -g supabaseDatabase + auth for web/mobile apps
Plugins to install (all recommended)
feature-dev, commit-commands, frontend-design, playground, claude-md-management, context7
Install via /plugin install <name>@claude-plugins-official for each.
Integration Strategy (GitHub, Supabase, Vercel)
Global tools (installed once, work everywhere):

gh (GitHub CLI) -- already installed & authenticated. Works in any project.
vercel -- global CLI, but each project links to its own Vercel project via vercel link
supabase -- global CLI, but each project connects to its own Supabase project

Per-project config (created when scaffolding each project):

.env / .env.local -- project-specific keys (SUPABASE_URL, API keys, etc.)
.claude/settings.json -- project-level MCP servers (e.g., Supabase MCP pointing at that project's database)
.vercel/ -- Vercel project link (created by vercel link)
Git remote -- each project gets its own GitHub repo

The /new-project skill will offer to set these up when creating a new project (e.g., "Do you want Supabase for this project?" -> creates Supabase project, adds MCP, sets up .env).
Install when needed (not now)

Firebase CLI, Netlify CLI, Bun, Docker, WSL
These get installed per-project as needed


Phase 5: Workflow Guide
A workflow guide will be embedded in the workspace CLAUDE.md covering:
Starting a new project:

Open Claude Code in C:\Luke
Say what you want to build, or use /new-project
Claude scaffolds it in the right subdirectory

Working on a project:

cd into the project directory
Describe what you want in natural language
Use /feature-dev for larger features (multi-agent)
Use /commit at stopping points

Deploying:

Use /deploy or say "ship it"

Research & learning:

Use /research [topic]
Use projects/research/ for experiments

Agent Teams (for large work):

Launch parallel agents: "Launch 3 agents to explore auth, database, and API layers"
Each works independently, reports back

SSH/Remote:

SSH into remote server, run claude there
Or use VS Code Remote SSH + Claude Code
GitHub Codespaces: gh codespace create


Phase 7: Vibe Coding Workflow (documented in workspace CLAUDE.md)
The end-to-end loop that gets embedded in the workspace CLAUDE.md:
Idea → /new-project → describe features → Claude builds →
screenshot → iterate → /commit → /deploy → /vibe-check → ship
Key patterns to document:

Start by describing what you want, not how to build it
Use /new-project to go from idea to running dev server in one step
Describe features in plain English; Claude handles implementation
Use /feature-dev for complex multi-step features (launches agent teams)
Say "take a screenshot" to see current state and iterate visually
Use /quick-fix when something breaks
/commit at every milestone, /deploy when ready to ship
/vibe-check before sharing to catch issues
/research [topic] when you need to learn something
Claude remembers project context between sessions via CLAUDE.md + auto-memory


Files to Create/Modify
#FileAction1C:\Luke\projects\web\.gitkeepCreate (new dir)2C:\Luke\projects\mobile\.gitkeepCreate (new dir)3C:\Luke\projects\tools\.gitkeepCreate (new dir)4C:\Luke\projects\research\.gitkeepCreate (new dir)5C:\Luke\projects\apis\.gitkeepCreate (new dir)6C:\Luke\templates\.gitkeepCreate (new dir)7C:\Luke\docs\research\.gitkeepCreate (new dir)8C:\Luke\.gitignoreCreate9C:\Luke\CLAUDE.mdCreate10C:\Users\lukem\.claude\CLAUDE.mdCreate11C:\Users\lukem\.claude\settings.jsonModify (add Context7, Playwright MCP)12C:\Luke\.claude\settings.local.jsonModify (expand permissions)13C:\Luke\.claude\skills\new-project\SKILL.mdCreate14C:\Luke\.claude\skills\deploy\SKILL.mdCreate15C:\Luke\.claude\skills\research\SKILL.mdCreate16C:\Luke\.claude\skills\vibe-check\SKILL.mdCreate17C:\Luke\.claude\skills\quick-fix\SKILL.mdCreate18C:\Luke\.cursorrulesCreate19C:\Luke\luke.code-workspaceCreate20C:\Luke\templates\ (starter templates)Create (deferred -- scaffolded on first use)21Git init + initial commitRun22pnpm add -g vercelRun23pnpm add -g supabaseRun24Install 6 Claude Code pluginsRun

Phase 5b: Cursor IDE Integration
5b.1 .cursorrules file
File: C:\Luke\.cursorrules
Mirrors the global CLAUDE.md preferences so Cursor's AI follows the same conventions:

TypeScript strict, functional components, Tailwind
pnpm, named exports, early returns
Project structure awareness

This ensures both Claude Code (agentic work) and Cursor (inline edits, Tab completion, Composer) produce consistent code.
5b.2 Cursor + Claude Code workflow
Document in workspace CLAUDE.md:

Cursor Tab / Cmd+K: Quick inline edits, autocomplete, small changes
Cursor Composer: Multi-file edits with context, medium complexity
Claude Code CLI/Desktop: Heavy agentic work -- scaffolding, deployments, agent teams, multi-step features
When to use which: Small edit = Cursor. New feature/big change = Claude Code. Both share the same CLAUDE.md and .cursorrules for consistency.

5b.3 Starter templates
Directory: C:\Luke\templates\
Create starter templates for quick project creation:

templates\nextjs-starter\ -- Next.js 15 + TypeScript + Tailwind + Supabase skeleton
templates\expo-starter\ -- Expo + TypeScript + NativeWind skeleton
templates\python-tool\ -- Python CLI tool with argparse + venv setup

Each template includes: package.json, CLAUDE.md, .env.example, .cursorrules, .gitignore, basic folder structure. Copy to start fast instead of scaffolding from scratch.
Phase 5c: Additional Skills
/quick-fix skill
File: C:\Luke\.claude\skills\quick-fix\SKILL.md
Fast diagnostic when something breaks:

Check console/terminal for errors
Check if dev server is running
Read error messages and trace to source
Suggest and apply fix
Verify the fix works

Screenshot-driven development
Document in CLAUDE.md: Claude can take screenshots via Puppeteer/Playwright MCP. Natural patterns:

"Screenshot my app and tell me what's wrong"
"Make the header look like [this screenshot]"
"Take a screenshot after each change so I can see progress"

Phase 6: Cross-Surface & Quality-of-Life
6.1 Works in both CLI and Desktop
All config files (CLAUDE.md, settings.json, skills, MCP servers) are shared between Claude Code CLI and Claude Desktop app. No separate setup needed. Agent Teams = CLI; Cowork = Desktop equivalent.
6.2 Auto-memory guidance
Add a note in global CLAUDE.md telling Claude to actively use the memory system (~/.claude/projects/ memory files) to record:

Project-specific patterns and conventions discovered
Luke's evolving preferences
Lessons learned from debugging sessions

6.3 VS Code workspace file
File: C:\Luke\luke.code-workspace
Workspace settings:

Format on save enabled
Tailwind CSS intellisense
Default terminal: PowerShell
Recommended extensions list
File associations for .md, .tsx, .ts

6.4 Project template .claude/settings.json
The /new-project skill will create a .claude/settings.json in each new project with sensible default permissions for that stack, so you don't have to approve the same commands repeatedly.

Verification
After implementation, verify by:

Run git status in C:\Luke -- should be a clean git repo
Check folder structure exists: ls C:\Luke\projects\*
Open a new Claude Code session in C:\Luke -- CLAUDE.md should load automatically
Test /new-project test-app -- should scaffold a project
Test /vibe-check in any project
Verify MCP servers load: Context7 and Playwright should appear in Claude Code's available tools
Run vercel --version -- should be installed