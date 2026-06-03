import { PLUGIN_ID } from "./constants.js";
import { injectGemTeamAgents } from "./hooks/config.js";
import { createModelRoutingHooks } from "./hooks/model-routing.js";
let activeConfig;
const server = async (_input, options) => {
    const hooks = {
        config: async (config) => {
            injectGemTeamAgents(config);
            activeConfig = config;
        },
        ...createModelRoutingHooks(options, () => activeConfig),
    };
    return hooks;
};
export default {
    id: PLUGIN_ID,
    server,
};
export { PLUGIN_ID, COMPLEXITY_TIERS } from "./constants.js";
export { classifyComplexityTier, isComplexityTier, normalizeComplexityTier } from "./routing/complexity.js";
export { resolveModel, validateGemTeamConfig } from "./routing/resolve-model.js";
export { applyChatParamsModelRouting, createModelRoutingHooks, previewModelRouting } from "./hooks/model-routing.js";
export { GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS } from "./agents/generated.js";
export { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "./agents/generated-loader.js";
export { GEM_TEAM_AGENT_COUNT, injectGemTeamAgents } from "./hooks/config.js";
export { CANONICAL_GEM_TEAM_SLUGS, validateManifest } from "./sync/validation.js";
//# sourceMappingURL=index.js.map