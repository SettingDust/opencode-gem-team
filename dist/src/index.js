import { PLUGIN_ID } from "./constants.js";
import { injectGemTeamAgents } from "./hooks/config.js";
import { createRoleReminderHooks } from "./hooks/role-reminder.js";
const server = async (_input, options) => {
    void options;
    const hooks = {
        config: async (config) => {
            injectGemTeamAgents(config);
        },
        ...createRoleReminderHooks(),
    };
    return hooks;
};
export default {
    id: PLUGIN_ID,
    server,
};
export { PLUGIN_ID } from "./constants.js";
export { GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS } from "./agents/generated.js";
export { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "./agents/generated-loader.js";
export { GEM_TEAM_AGENT_COUNT, injectGemTeamAgents } from "./hooks/config.js";
export { CANONICAL_GEM_TEAM_SLUGS, validateManifest } from "./sync/validation.js";
//# sourceMappingURL=index.js.map