export const SCHEMA_SQL = `
-- Global config
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    project_type TEXT NOT NULL,
    status TEXT DEFAULT 'setup',
    project_path TEXT NOT NULL,
    stack TEXT,
    connections TEXT,
    model_config TEXT,
    git_repo TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);

-- Project plans (versioned)
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    approved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_plans_project ON plans(project_id);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    plan_id TEXT NOT NULL REFERENCES plans(id),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_plan ON milestones(plan_id);

-- Execution cycles
CREATE TABLE IF NOT EXISTS execution_cycles (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    plan_id TEXT REFERENCES plans(id),
    cycle_number INTEGER NOT NULL,
    phase TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    started_at TEXT NOT NULL,
    completed_at TEXT,
    summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_cycles_project ON execution_cycles(project_id);

-- Agent sessions
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    cycle_id TEXT REFERENCES execution_cycles(id),
    parent_agent_id TEXT REFERENCES agents(id),
    role TEXT NOT NULL,
    model TEXT NOT NULL,
    claude_session_id TEXT,
    status TEXT DEFAULT 'running',
    prompt_summary TEXT,
    result_summary TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_cycle ON agents(cycle_id);
CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    milestone_id TEXT REFERENCES milestones(id),
    cycle_id TEXT REFERENCES execution_cycles(id),
    agent_id TEXT REFERENCES agents(id),
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    complexity TEXT DEFAULT 'medium',
    expected_files TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id TEXT NOT NULL REFERENCES tasks(id),
    blocked_by TEXT NOT NULL REFERENCES tasks(id),
    PRIMARY KEY (task_id, blocked_by)
);

-- Tool calls
CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    tool_name TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    success INTEGER DEFAULT 1,
    duration_ms INTEGER,
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tools_agent ON tool_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_tools_project ON tool_calls(project_id);

-- Connections
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    installed_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_connections_project ON connections(project_id);

-- Checkpoints
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    cycle_id TEXT REFERENCES execution_cycles(id),
    agent_id TEXT REFERENCES agents(id),
    type TEXT NOT NULL,
    question TEXT NOT NULL,
    context TEXT,
    response TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    answered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON checkpoints(status);

-- Activity events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT REFERENCES projects(id),
    event_type TEXT NOT NULL,
    agent_id TEXT,
    data TEXT,
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Research documents
CREATE TABLE IF NOT EXISTS research_docs (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    agent_id TEXT REFERENCES agents(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_research_project ON research_docs(project_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_messages(project_id, created_at);

-- Orchestrator state persistence
CREATE TABLE IF NOT EXISTS orchestrator_state (
    project_id TEXT PRIMARY KEY REFERENCES projects(id),
    state TEXT NOT NULL,
    cycle_number INTEGER DEFAULT 0,
    plan_json TEXT,
    context_json TEXT,
    stuck_timer_start INTEGER,
    updated_at INTEGER NOT NULL
);

-- Phase history (loop/churn detection)
CREATE TABLE IF NOT EXISTS phase_history (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    phase_name TEXT NOT NULL,
    task_description TEXT NOT NULL,
    file_changes_hash TEXT,
    outcome TEXT NOT NULL,
    review_score INTEGER,
    context_summary TEXT,
    duration_ms INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phase_project ON phase_history(project_id, created_at);

-- Agent actions (hallucination detection)
CREATE TABLE IF NOT EXISTS agent_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    tool_name TEXT NOT NULL,
    tool_input_json TEXT NOT NULL,
    tool_output_json TEXT,
    verified INTEGER DEFAULT 1,
    timestamp INTEGER NOT NULL
);

-- MCP server health
CREATE TABLE IF NOT EXISTS mcp_health (
    server_name TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    status TEXT NOT NULL,
    consecutive_failures INTEGER DEFAULT 0,
    circuit_state TEXT DEFAULT 'closed',
    last_healthy INTEGER,
    last_checked INTEGER,
    PRIMARY KEY (server_name, project_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    level TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_required INTEGER DEFAULT 0,
    action_url TEXT,
    dismissed INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_project ON notifications(project_id, dismissed);

-- Error log
CREATE TABLE IF NOT EXISTS error_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    context_json TEXT NOT NULL,
    resolution_json TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_errors_project ON error_log(project_id, created_at);

-- Machine capabilities
CREATE TABLE IF NOT EXISTS machine_capabilities (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    capabilities_json TEXT NOT NULL,
    scanned_at INTEGER NOT NULL
);
`;
