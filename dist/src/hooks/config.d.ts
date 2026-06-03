import { getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js";
export type OpenCodeAgentConfig = {
    description?: string;
    mode?: "primary" | "subagent" | "all" | string;
    prompt?: string;
    model?: string;
    [key: string]: unknown;
};
export type OpenCodeConfigWithAgents = {
    agent?: Record<string, OpenCodeAgentConfig | undefined>;
    [key: string]: unknown;
};
export declare const GEM_TEAM_AGENT_COUNT: 16;
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
