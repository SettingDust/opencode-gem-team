import type { Hooks, Plugin, PluginModule } from "@opencode-ai/plugin"

import { PLUGIN_ID } from "./constants.js"
import { injectGemTeamAgents } from "./hooks/config.js"
import { createModelRoutingHooks } from "./hooks/model-routing.js"
import type { OpenCodeConfigWithAgents } from "./hooks/config.js"

let activeConfig: OpenCodeConfigWithAgents | undefined

const server: Plugin = async (_input, options) => {
  const hooks: Hooks = {
    config: async (config) => {
      injectGemTeamAgents(config)
      activeConfig = config
    },
    ...createModelRoutingHooks(options, () => activeConfig),
  }

  return hooks
}

export default {
  id: PLUGIN_ID,
  server,
} satisfies PluginModule

export { PLUGIN_ID, COMPLEXITY_TIERS } from "./constants.js"
export { classifyComplexityTier, isComplexityTier, normalizeComplexityTier } from "./routing/complexity.js"
export { resolveModel, validateGemTeamConfig } from "./routing/resolve-model.js"
export { applyChatParamsModelRouting, createModelRoutingHooks, previewModelRouting } from "./hooks/model-routing.js"
export { GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS } from "./agents/generated.js"
export { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "./agents/generated-loader.js"
export { GEM_TEAM_AGENT_COUNT, injectGemTeamAgents } from "./hooks/config.js"
export { CANONICAL_GEM_TEAM_SLUGS, validateManifest } from "./sync/validation.js"
export type {
  ComplexityClassificationInput,
  ComplexityClassificationResult,
  ComplexityModels,
  ComplexityTier,
  GemTeamConfigSchema,
  GemTeamConfigValidationResult,
  GemTeamPluginOptions,
  ModelRoutingHookMutationPreview,
  ModelRoutingHookMutationStatus,
  ModelRoutingSignals,
  ModelResolutionSource,
  ModelResolutionStatus,
  NormalizeTierResult,
  PreviewModelRoutingInput,
  PreviewModelRoutingResult,
  ResolveModelInput,
  ResolveModelResult,
  TierNormalizationStatus,
} from "./types.js"
export type { GemTeamSlug, SyncedAgentManifestEntry, SyncedAgentsManifest, SyncValidationResult } from "./sync/validation.js"
