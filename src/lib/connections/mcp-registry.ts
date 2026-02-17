import type { ConnectionSpec } from "@/types/connection";

// Built-in registry of known-good MCP servers
export const BUILTIN_MCP_REGISTRY: ConnectionSpec[] = [
  {
    name: "Supabase",
    description: "PostgreSQL database, auth, realtime, storage",
    type: "mcp",
    mcpConfig: {
      transport: "http",
      url: "https://mcp.supabase.com/mcp",
    },
    credentialSpec: {
      fields: [
        {
          key: "supabase_url",
          label: "Supabase Project URL",
          placeholder: "https://xyz.supabase.co",
          sensitive: false,
          required: true,
          helpUrl: "https://supabase.com/dashboard/project/_/settings/api",
        },
        {
          key: "supabase_anon_key",
          label: "Anon/Public Key",
          placeholder: "eyJ...",
          sensitive: true,
          required: true,
          helpUrl: "https://supabase.com/dashboard/project/_/settings/api",
        },
        {
          key: "supabase_service_role_key",
          label: "Service Role Key (for backend)",
          placeholder: "eyJ...",
          sensitive: true,
          required: false,
          helpUrl: "https://supabase.com/dashboard/project/_/settings/api",
        },
      ],
    },
    recommendedFor: ["saas", "web-app", "api"],
  },
  {
    name: "Vercel",
    description: "Deployment platform for frontend and serverless",
    type: "mcp",
    mcpConfig: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@vercel/mcp"],
    },
    credentialSpec: {
      fields: [
        {
          key: "vercel_token",
          label: "Vercel API Token",
          placeholder: "...",
          sensitive: true,
          required: true,
          helpUrl: "https://vercel.com/account/tokens",
        },
      ],
    },
    recommendedFor: ["web-app", "saas"],
  },
  {
    name: "Stripe",
    description: "Payment processing",
    type: "mcp",
    mcpConfig: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@stripe/mcp"],
    },
    credentialSpec: {
      fields: [
        {
          key: "stripe_secret_key",
          label: "Stripe Secret Key",
          placeholder: "sk_test_...",
          sensitive: true,
          required: true,
          helpUrl: "https://dashboard.stripe.com/apikeys",
        },
      ],
    },
    recommendedFor: ["saas", "e-commerce"],
  },
  {
    name: "Resend",
    description: "Email sending API",
    type: "mcp",
    mcpConfig: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@resend/mcp"],
    },
    credentialSpec: {
      fields: [
        {
          key: "resend_api_key",
          label: "Resend API Key",
          placeholder: "re_...",
          sensitive: true,
          required: true,
          helpUrl: "https://resend.com/api-keys",
        },
      ],
    },
    recommendedFor: ["saas", "web-app"],
  },
  {
    name: "Context7",
    description: "Up-to-date library documentation search",
    type: "mcp",
    mcpConfig: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    },
    credentialSpec: {
      fields: [],
    },
    recommendedFor: ["web-app", "saas", "api", "mobile-app"],
  },
  {
    name: "Playwright",
    description: "Browser automation, testing, and screenshots",
    type: "mcp",
    mcpConfig: {
      transport: "stdio",
      command: "npx",
      args: ["@playwright/mcp@latest"],
    },
    credentialSpec: {
      fields: [],
    },
    recommendedFor: ["web-app", "saas", "e-commerce"],
  },
];

export function searchRegistry(query: string): ConnectionSpec[] {
  const lower = query.toLowerCase();
  return BUILTIN_MCP_REGISTRY.filter(
    (spec) =>
      spec.name.toLowerCase().includes(lower) ||
      spec.description.toLowerCase().includes(lower) ||
      spec.recommendedFor?.some((tag) => tag.includes(lower)),
  );
}

export function getRecommendationsForProjectType(
  projectType: string,
): ConnectionSpec[] {
  const lower = projectType.toLowerCase();
  return BUILTIN_MCP_REGISTRY.filter((spec) =>
    spec.recommendedFor?.some((tag) => tag === lower || lower.includes(tag)),
  );
}
