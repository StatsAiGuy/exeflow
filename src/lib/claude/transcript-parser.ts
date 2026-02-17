import fs from "fs";
import readline from "readline";

export interface TranscriptEntry {
  type: "system" | "human" | "assistant" | "tool_use" | "tool_result";
  timestamp?: number;
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  sessionId?: string;
}

export interface TranscriptSummary {
  sessionId: string | null;
  model: string | null;
  totalEntries: number;
  toolCalls: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: string | null;
    success: boolean;
  }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  filesModified: string[];
  bashCommands: string[];
  errors: string[];
  duration: number | null;
}

/**
 * Parse a Claude Code .jsonl transcript file into structured entries.
 */
export async function parseTranscript(filePath: string): Promise<TranscriptEntry[]> {
  const entries: TranscriptEntry[] = [];

  if (!fs.existsSync(filePath)) {
    return entries;
  }

  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const entry = mapToEntry(parsed);
      if (entry) entries.push(entry);
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

/**
 * Parse and summarize a transcript for the orchestrator.
 */
export async function summarizeTranscript(filePath: string): Promise<TranscriptSummary> {
  const entries = await parseTranscript(filePath);

  const summary: TranscriptSummary = {
    sessionId: null,
    model: null,
    totalEntries: entries.length,
    toolCalls: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    filesModified: [],
    bashCommands: [],
    errors: [],
    duration: null,
  };

  const filesSet = new Set<string>();
  let firstTimestamp: number | null = null;
  let lastTimestamp: number | null = null;

  for (const entry of entries) {
    if (entry.timestamp) {
      if (firstTimestamp === null) firstTimestamp = entry.timestamp;
      lastTimestamp = entry.timestamp;
    }

    if (entry.sessionId && !summary.sessionId) {
      summary.sessionId = entry.sessionId;
    }

    if (entry.model && !summary.model) {
      summary.model = entry.model;
    }

    if (entry.tokensInput) summary.totalInputTokens += entry.tokensInput;
    if (entry.tokensOutput) summary.totalOutputTokens += entry.tokensOutput;

    if (entry.type === "tool_use" && entry.toolName) {
      const toolCall = {
        tool: entry.toolName,
        input: entry.toolInput || {},
        output: null as string | null,
        success: true,
      };

      // Track file modifications
      if (
        (entry.toolName === "Write" || entry.toolName === "Edit") &&
        entry.toolInput
      ) {
        const fp = (entry.toolInput.file_path ||
          entry.toolInput.filePath) as string;
        if (fp) filesSet.add(fp);
      }

      // Track bash commands
      if (entry.toolName === "Bash" && entry.toolInput) {
        const cmd = entry.toolInput.command as string;
        if (cmd) summary.bashCommands.push(cmd);
      }

      summary.toolCalls.push(toolCall);
    }

    if (entry.type === "tool_result") {
      const lastTool = summary.toolCalls[summary.toolCalls.length - 1];
      if (lastTool) {
        lastTool.output = entry.toolOutput || null;
        if (entry.toolOutput?.includes("Error") || entry.toolOutput?.includes("error")) {
          lastTool.success = false;
          summary.errors.push(
            `${lastTool.tool}: ${entry.toolOutput.slice(0, 200)}`,
          );
        }
      }
    }
  }

  summary.filesModified = Array.from(filesSet);

  if (firstTimestamp !== null && lastTimestamp !== null) {
    summary.duration = lastTimestamp - firstTimestamp;
  }

  return summary;
}

function mapToEntry(raw: Record<string, unknown>): TranscriptEntry | null {
  const type = raw.type as string;
  const role = raw.role as string | undefined;

  // System messages
  if (type === "system" || role === "system") {
    return {
      type: "system",
      timestamp: raw.timestamp as number | undefined,
      content: extractContent(raw),
      sessionId: raw.session_id as string | undefined,
      model: raw.model as string | undefined,
    };
  }

  // Human messages
  if (role === "human" || role === "user") {
    return {
      type: "human",
      timestamp: raw.timestamp as number | undefined,
      content: extractContent(raw),
    };
  }

  // Assistant messages with tool use
  if (role === "assistant" || type === "assistant") {
    const toolUse = extractToolUse(raw);
    if (toolUse) {
      return {
        type: "tool_use",
        timestamp: raw.timestamp as number | undefined,
        toolName: toolUse.name,
        toolInput: toolUse.input,
        tokensInput: raw.usage
          ? (raw.usage as Record<string, number>).input_tokens
          : undefined,
        tokensOutput: raw.usage
          ? (raw.usage as Record<string, number>).output_tokens
          : undefined,
      };
    }

    return {
      type: "assistant",
      timestamp: raw.timestamp as number | undefined,
      content: extractContent(raw),
      model: raw.model as string | undefined,
      tokensInput: raw.usage
        ? (raw.usage as Record<string, number>).input_tokens
        : undefined,
      tokensOutput: raw.usage
        ? (raw.usage as Record<string, number>).output_tokens
        : undefined,
    };
  }

  // Tool results
  if (type === "tool_result" || raw.tool_result !== undefined) {
    return {
      type: "tool_result",
      timestamp: raw.timestamp as number | undefined,
      toolOutput:
        typeof raw.content === "string"
          ? raw.content
          : typeof raw.tool_result === "string"
            ? raw.tool_result
            : JSON.stringify(raw.content || raw.tool_result),
    };
  }

  return null;
}

function extractContent(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.content === "string") return raw.content;
  if (Array.isArray(raw.content)) {
    return raw.content
      .map((block: Record<string, unknown>) => {
        if (typeof block === "string") return block;
        if (block.type === "text") return block.text as string;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return undefined;
}

function extractToolUse(
  raw: Record<string, unknown>,
): { name: string; input: Record<string, unknown> } | null {
  // Check content array for tool_use blocks
  if (Array.isArray(raw.content)) {
    for (const block of raw.content) {
      const b = block as Record<string, unknown>;
      if (b.type === "tool_use" && b.name) {
        return {
          name: b.name as string,
          input: (b.input as Record<string, unknown>) || {},
        };
      }
    }
  }

  // Check direct tool_use fields
  if (raw.tool_use && typeof raw.tool_use === "object") {
    const tu = raw.tool_use as Record<string, unknown>;
    return {
      name: tu.name as string,
      input: (tu.input as Record<string, unknown>) || {},
    };
  }

  return null;
}
