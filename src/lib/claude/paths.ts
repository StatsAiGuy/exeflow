import path from "path";
import os from "os";

export function getExeflowDataDir(): string {
  return path.join(os.homedir(), ".exeflow");
}

export function getProjectsDir(): string {
  return path.join(getExeflowDataDir(), "projects");
}

export function getProjectDir(projectName: string): string {
  return path.join(getProjectsDir(), projectName);
}

export function getProjectWorkspaceDir(projectName: string): string {
  return path.join(getProjectDir(projectName), "workspace");
}

export function getConfigPath(): string {
  return path.join(getExeflowDataDir(), "config.json");
}

export function getCredentialsPath(): string {
  return path.join(getExeflowDataDir(), "credentials.json");
}

export function getDbPath(): string {
  return path.join(getExeflowDataDir(), "exeflow.db");
}

export function getLearningDir(projectType: string): string {
  return path.join(getExeflowDataDir(), "learning", projectType);
}

export function getResearchDir(): string {
  return path.join(getExeflowDataDir(), "research");
}
