export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "skipped";

export type TaskComplexity = "simple" | "medium" | "complex";

export interface Task {
  id: string;
  projectId: string;
  milestoneId: string | null;
  cycleId: string | null;
  agentId: string | null;
  subject: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  complexity: TaskComplexity;
  expectedFiles: string[] | null;
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface TaskDependency {
  taskId: string;
  blockedBy: string;
}
