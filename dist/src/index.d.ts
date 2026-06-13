import type { Plugin } from "@opencode-ai/plugin";
declare const _default: {
    id: "opencode-gem-team";
    server: Plugin;
};
export default _default;
export { PLUGIN_ID } from "./constants.js";
export { GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS } from "./agents/generated.js";
export { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "./agents/generated-loader.js";
export { GEM_TEAM_AGENT_COUNT, injectGemTeamAgents } from "./hooks/config.js";
export { CANONICAL_GEM_TEAM_SLUGS, validateManifest } from "./sync/validation.js";
export type { GemTeamSlug, SyncedAgentManifestEntry, SyncedAgentsManifest, SyncValidationResult } from "./sync/validation.js";
