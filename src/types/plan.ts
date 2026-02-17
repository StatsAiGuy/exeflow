export type PlanStatus = "draft" | "approved" | "active" | "completed" | "superseded";

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface Plan {
  id: string;
  projectId: string;
  version: number;
  content: PlanContent;
  status: PlanStatus;
  createdAt: string;
  approvedAt: string | null;
}

export interface PlanContent {
  milestones: PlanMilestone[];
  milestoneOrder: string[];
}

export interface PlanMilestone {
  id: string;
  title: string;
  description: string;
  tasks: PlanTask[];
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  complexity: "simple" | "complex";
  expectedFiles: string[];
  dependsOn: string[];
  parallelEligible: boolean;
  estimatedTurns: number;
  verification: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  planId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  status: MilestoneStatus;
  createdAt: string;
  completedAt: string | null;
}
