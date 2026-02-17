import type { Project, ProjectStack, ModelConfig } from "@/types/project";

export interface CreateProjectInput {
  name: string;
  description: string;
  projectType: string;
  stack?: ProjectStack;
  modelConfig?: ModelConfig;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  stack?: ProjectStack;
  connections?: string;
  modelConfig?: ModelConfig;
  gitRepo?: string;
}

export type { Project, ProjectStack, ModelConfig };
