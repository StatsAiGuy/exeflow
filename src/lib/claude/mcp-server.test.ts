import { describe, it, expect } from "vitest";
import { EXEFLOW_MCP_TOOLS, handleToolCall } from "./mcp-server";

describe("MCP Server", () => {
  describe("EXEFLOW_MCP_TOOLS", () => {
    it("defines exeflow_status tool", () => {
      const tool = EXEFLOW_MCP_TOOLS.find((t) => t.name === "exeflow_status");
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain("project_id");
    });

    it("defines exeflow_checkpoint tool", () => {
      const tool = EXEFLOW_MCP_TOOLS.find(
        (t) => t.name === "exeflow_checkpoint",
      );
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain("project_id");
      expect(tool!.inputSchema.required).toContain("question");
    });
  });

  describe("handleToolCall", () => {
    it("returns error for unknown tool", () => {
      const result = handleToolCall("unknown_tool", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown tool");
    });
  });
});
