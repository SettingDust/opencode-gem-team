import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js"

export type OpenCodePermissionAction = "ask" | "allow" | "deny"
export type OpenCodePermissionRule = OpenCodePermissionAction | Record<string, OpenCodePermissionAction>
export type OpenCodePermissionConfig = OpenCodePermissionAction | Record<string, OpenCodePermissionRule>

export type OpenCodeAgentConfig = {
  description?: string
  mode?: "primary" | "subagent" | "all" | string
  prompt?: string
  model?: string
  permission?: OpenCodePermissionConfig
  [key: string]: unknown
}

export type OpenCodeConfigWithAgents = {
  agent?: Record<string, OpenCodeAgentConfig | undefined>
  [key: string]: unknown
}

export const GEM_TEAM_AGENT_COUNT = 16 as const

const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator"

export const GEM_ORCHESTRATOR_PROMPT_NOTICE = `## IMPORTANT NOTICE about your workflow

You are the orchestrator. Before EVERY action - delegating via \`task\`, updating \`docs/plan/*\`, running git, clarifying, or anything else - output a decision block, then perform that action in the SAME turn:

Phase: <current phase>
Complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
Action: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>
Decision path: <...>

Action MUST be one or more of the values listed above (combine multiple with \` + \`, e.g. \`debug + implement\`) - never \`delegate\`, \`task\`, or any other freeform verb. Use Action to name the work type, including direct orchestrator work like plan bookkeeping, git, or clarification. Use Decision path to say whether you do it directly or route it to a subagent.

The decision block is narration only and does not change or block what you do next - just continue performing the action as normal.

When a tool call fails, analyze the error first:
- Schema/parameter error (\`invalid_params\`, missing required field) -> fix the parameter and retry
- Permission denied (\`permission_denied\`) -> delegate the action to the appropriate subagent; do not retry
- File/resource not found -> verify the path is correct (use relative paths, not absolute); retry or delegate discovery
- Other errors -> determine if it's transient (retry), a blocker (escalate), or requires delegation

Do not stop after one failure. Analyze the cause and choose the right recovery path.

When calling tools, always use relative paths (relative to project root), not absolute paths.

At workflow checkpoints - after Phase 2 plan generation/loading and after each Phase 3 wave - output a checkpoint block, then continue in the same turn:

Current phase: <2 | 3>
Complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
Wave completed: <N, or n/a outside Phase 3>
Next step: <...>`
export function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void {
  config.agent ??= {}

  for (const generated of getGeneratedGemTeamAgents()) {
    const existing = config.agent[generated.slug]
    const base: OpenCodeAgentConfig = {
      description: generated.description,
      mode: generated.mode,
      prompt: generated.prompt,
    }

    if (generated.slug === GEM_ORCHESTRATOR_SLUG) {
      base.prompt = generated.prompt ? `${generated.prompt}\n\n${GEM_ORCHESTRATOR_PROMPT_NOTICE}` : GEM_ORCHESTRATOR_PROMPT_NOTICE
    }

    config.agent[generated.slug] = existing ? mergeMissingAgentFields(existing, base) : base
  }
}

export { getGemOrchestratorRoutingTargets }

function mergeMissingAgentFields(existing: OpenCodeAgentConfig, generated: OpenCodeAgentConfig): OpenCodeAgentConfig {
  return {
    ...generated,
    ...existing,
  }
}
