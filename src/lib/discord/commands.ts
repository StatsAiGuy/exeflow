export interface SlashCommand {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    type: number; // 3 = STRING, 4 = INTEGER, 5 = BOOLEAN
    required?: boolean;
    choices?: Array<{ name: string; value: string }>;
  }>;
}

// Discord slash commands for /exeflow
export const EXEFLOW_COMMANDS: SlashCommand[] = [
  {
    name: "status",
    description: "Get the current status of a project",
    options: [
      {
        name: "project",
        description: "Project name",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "projects",
    description: "List all projects",
  },
  {
    name: "approve",
    description: "Approve a pending checkpoint",
    options: [
      {
        name: "checkpoint_id",
        description: "ID of the checkpoint to approve",
        type: 3,
        required: true,
      },
      {
        name: "message",
        description: "Optional message with your approval",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "reject",
    description: "Reject a pending checkpoint",
    options: [
      {
        name: "checkpoint_id",
        description: "ID of the checkpoint to reject",
        type: 3,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for rejection",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "pause",
    description: "Pause a running project",
    options: [
      {
        name: "project",
        description: "Project name",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "resume",
    description: "Resume a paused project",
    options: [
      {
        name: "project",
        description: "Project name",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "ask",
    description: "Ask the lead agent a question",
    options: [
      {
        name: "project",
        description: "Project name",
        type: 3,
        required: true,
      },
      {
        name: "message",
        description: "Your question or message",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "tasks",
    description: "View current tasks for a project",
    options: [
      {
        name: "project",
        description: "Project name",
        type: 3,
        required: true,
      },
    ],
  },
];
