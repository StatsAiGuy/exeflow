import { describe, it, expect } from "vitest";
import {
  getExeflowDataDir,
  getProjectsDir,
  getProjectDir,
  getProjectWorkspaceDir,
  getConfigPath,
  getCredentialsPath,
  getDbPath,
  getLearningDir,
  getResearchDir,
} from "./paths";
import path from "path";
import os from "os";

describe("claude paths", () => {
  const home = os.homedir();
  const base = path.join(home, ".exeflow");

  it("getExeflowDataDir returns ~/.exeflow", () => {
    expect(getExeflowDataDir()).toBe(base);
  });

  it("getProjectsDir returns ~/.exeflow/projects", () => {
    expect(getProjectsDir()).toBe(path.join(base, "projects"));
  });

  it("getProjectDir returns project-specific path", () => {
    expect(getProjectDir("my-project")).toBe(
      path.join(base, "projects", "my-project"),
    );
  });

  it("getProjectWorkspaceDir returns workspace subdir", () => {
    expect(getProjectWorkspaceDir("my-project")).toBe(
      path.join(base, "projects", "my-project", "workspace"),
    );
  });

  it("getConfigPath returns config.json path", () => {
    expect(getConfigPath()).toBe(path.join(base, "config.json"));
  });

  it("getCredentialsPath returns credentials.json path", () => {
    expect(getCredentialsPath()).toBe(path.join(base, "credentials.json"));
  });

  it("getDbPath returns exeflow.db path", () => {
    expect(getDbPath()).toBe(path.join(base, "exeflow.db"));
  });

  it("getLearningDir returns learning directory for project type", () => {
    expect(getLearningDir("saas")).toBe(path.join(base, "learning", "saas"));
  });

  it("getResearchDir returns research directory", () => {
    expect(getResearchDir()).toBe(path.join(base, "research"));
  });
});
