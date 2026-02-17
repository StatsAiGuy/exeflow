export function generateProjectStandardsRule(stackName: string): string {
  return `# Project Standards

## Code Style
- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Use named exports over default exports
- Use async/await over raw promises

## Naming
- Files: kebab-case (e.g., user-profile.ts)
- Components: PascalCase (e.g., UserProfile.tsx)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/interfaces: PascalCase

## Stack: ${stackName}
- Follow ${stackName} best practices and conventions
- Use the project's established patterns
`;
}

export function generateSecurityRule(): string {
  return `# Security Policies

## OWASP Top 10
- No hardcoded secrets, API keys, passwords, or tokens
- No eval(), new Function(), or innerHTML with user data
- Use parameterized queries — no SQL string concatenation
- Validate all input at API boundaries
- Sanitize user-provided content before rendering
- Use HTTPS for all external API calls
- No command injection — sanitize shell inputs

## Dependency Security
- Only install from trusted registries (npmjs.com)
- Check for typosquatted packages
- Run \`npm audit\` after adding dependencies
`;
}

export function generateExeflowConstraintsRule(): string {
  return `# Exeflow Constraints

## Workspace Isolation
- Do NOT modify files outside the project workspace
- Do NOT access ~/.exeflow/ directory
- Do NOT modify .claude/ configuration files
- Do NOT read credentials.json

## Git Safety
- Do NOT force push
- Do NOT amend published commits
- Do NOT delete branches without explicit user request

## Execution
- Stay focused on the current task
- Do NOT add features not in the plan
- Do NOT refactor code outside your task scope
- Report blockers clearly instead of working around them
`;
}

export function generateTestingRule(): string {
  return `# Testing Requirements

## Test Coverage
- Write tests for all new functionality
- Cover happy path and common error cases
- Do NOT delete existing tests
- Fix broken tests, don't skip them

## Test Style
- Use descriptive test names
- One assertion per test when practical
- Test behavior, not implementation details
`;
}
