import { getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js";
export type OpenCodePermissionAction = "ask" | "allow" | "deny";
export type OpenCodePermissionRule = OpenCodePermissionAction | Record<string, OpenCodePermissionAction>;
export type OpenCodePermissionConfig = OpenCodePermissionAction | Record<string, OpenCodePermissionRule>;
export type OpenCodeAgentConfig = {
    description?: string;
    mode?: "primary" | "subagent" | "all" | string;
    prompt?: string;
    model?: string;
    permission?: OpenCodePermissionConfig;
    [key: string]: unknown;
};
export type OpenCodeConfigWithAgents = {
    agent?: Record<string, OpenCodeAgentConfig | undefined>;
    [key: string]: unknown;
};
export declare const GEM_TEAM_AGENT_COUNT: 16;
export declare const GEM_ORCHESTRATOR_PROMPT_NOTICE = "## IMPORTANT NOTICE about your workflow\n\nYou are the orchestrator. Before EVERY action \u2014 delegating via `task`, updating plan bookkeeping under `docs/plan/**`, running git, clarifying, or anything else \u2014 you MUST first output a decision block:\n\nPhase: <current phase>\nAction type: <delegate | plan-bookkeeping | git | clarify | ...>\nTarget: <gem-<slug> when delegating, otherwise the file or command>\nReasoning: <why this action and target fit the current phase and your workflow/role>\n\nOnly after emitting this block may you act. Acting without a verbalized decision block is a workflow violation. If an action is denied (`permission_denied`), that is the expected signal to delegate it \u2014 do not retry.";
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
