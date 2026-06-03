import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js"

export type OpenCodeAgentConfig = {
  description?: string
  mode?: "primary" | "subagent" | "all" | string
  prompt?: string
  model?: string
  [key: string]: unknown
}

export type OpenCodeConfigWithAgents = {
  agent?: Record<string, OpenCodeAgentConfig | undefined>
  [key: string]: unknown
}

export const GEM_TEAM_AGENT_COUNT = 16 as const

export function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void {
  config.agent ??= {}

  for (const generated of getGeneratedGemTeamAgents()) {
    const existing = config.agent[generated.slug]
    const base: OpenCodeAgentConfig = {
      description: generated.description,
      mode: generated.mode,
      prompt: generated.prompt,
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
