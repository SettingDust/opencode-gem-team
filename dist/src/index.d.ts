import type { Plugin } from "@opencode-ai/plugin";
declare const _default: {
    id: "opencode-gem-team";
    server: Plugin;
};
export default _default;
export { PLUGIN_ID, COMPLEXITY_TIERS } from "./constants.js";
export { classifyComplexityTier, isComplexityTier, normalizeComplexityTier } from "./routing/complexity.js";
export { resolveModel, validateGemTeamConfig } from "./routing/resolve-model.js";
export { applyChatParamsModelRouting, createModelRoutingHooks, createRoutingToastNotifier, previewModelRouting } from "./hooks/model-routing.js";
export { GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS } from "./agents/generated.js";
export { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "./agents/generated-loader.js";
export { GEM_TEAM_AGENT_COUNT, injectGemTeamAgents } from "./hooks/config.js";
export { CANONICAL_GEM_TEAM_SLUGS, validateManifest } from "./sync/validation.js";
export type { ComplexityClassificationInput, ComplexityClassificationResult, ComplexityModels, ComplexityTier, GemTeamConfigSchema, GemTeamConfigValidationResult, GemTeamPluginOptions, ModelRoutingHookMutationPreview, ModelRoutingHookMutationStatus, ModelRoutingSignals, ModelResolutionSource, ModelResolutionStatus, NormalizeTierResult, PreviewModelRoutingInput, PreviewModelRoutingResult, ResolveModelInput, ResolveModelResult, RoutingToastNotifier, RoutingToastPayload, TierNormalizationStatus, } from "./types.js";
export type { GemTeamSlug, SyncedAgentManifestEntry, SyncedAgentsManifest, SyncValidationResult } from "./sync/validation.js";
