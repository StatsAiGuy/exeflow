export type ConnectionType = "mcp" | "builtin";
export type ConnectionStatus = "active" | "inactive" | "error";

export interface Connection {
  id: string;
  projectId: string | null;
  name: string;
  type: ConnectionType;
  config: ConnectionConfig;
  status: ConnectionStatus;
  installedAt: string;
}

export interface ConnectionConfig {
  transport?: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  envMapping?: Record<string, string>;
}

export interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  sensitive: boolean;
  required: boolean;
  helpUrl?: string;
}

export interface ConnectionSpec {
  name: string;
  description: string;
  type: ConnectionType;
  mcpConfig?: ConnectionConfig;
  credentialSpec: {
    fields: CredentialField[];
  };
  recommendedFor?: string[];
}
