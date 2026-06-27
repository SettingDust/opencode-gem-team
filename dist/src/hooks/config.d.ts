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
export declare const GEM_ORCHESTRATOR_PROMPT_NOTICE = "## IMPORTANT NOTICE about your workflow\n\nYou are the orchestrator. Before EVERY action, output a decision block, then carry out that action in the same turn:\n\nPhase: <current phase>\nComplexity: <TRIVIAL|LOW|MEDIUM|HIGH>\nAction: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>\nDecision: <delegate to which subagent or handle directly, per your Complexity + Action + agent rules>\n\nAction is one or more of the listed verbs (combine with ` + `).\n\nAt workflow checkpoints - after Phase 2 plan generation/loading and after each Phase 3 wave - output a checkpoint block, then continue in the same turn:\n\nCurrent phase: <2 | 3>\nComplexity: <TRIVIAL|LOW|MEDIUM|HIGH>\nWave completed: <N, or n/a outside Phase 3>\nAction: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>\nDecision: <delegate to which subagent or handle directly, per your Complexity + Action + agent rules>\n";
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
