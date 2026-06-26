import type { Hooks, Plugin, PluginModule } from "@opencode-ai/plugin"

import { PLUGIN_ID } from "./constants.js"
import { injectGemTeamAgents } from "./hooks/config.js"
import { createGemOrchestratorToolGuard } from "./hooks/tool-guard.js"

const server: Plugin = async (input, options) => {
  void options
  const hooks: Hooks = {
    config: async (config) => {
      injectGemTeamAgents(config)
    },
    "tool.execute.before": createGemOrchestratorToolGuard(input.client, input.directory),
  }

  return hooks
}

export default {
  id: PLUGIN_ID,
  server,
} satisfies PluginModule

export { PLUGIN_ID } from "./constants.js"
export { GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS } from "./agents/generated.js"
export { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "./agents/generated-loader.js"
export { GEM_TEAM_AGENT_COUNT, injectGemTeamAgents } from "./hooks/config.js"
export { CANONICAL_GEM_TEAM_SLUGS, validateManifest } from "./sync/validation.js"
export type { GemTeamSlug, SyncedAgentManifestEntry, SyncedAgentsManifest, SyncValidationResult } from "./sync/validation.js"
