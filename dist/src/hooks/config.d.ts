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
export declare const GEM_ORCHESTRATOR_PROMPT_NOTICE = "## IMPORTANT NOTICE about your workflow\n\nYou are the orchestrator. Before EVERY action - delegating via `task`, updating `docs/plan/*`, running git, clarifying, or anything else - output a decision block, then perform that action in the SAME turn:\n\nPhase: <current phase>\nComplexity: <TRIVIAL|LOW|MEDIUM|HIGH>\nAction: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>\nDecision path: <...>\n\nAction MUST be one or more of the values listed above (combine multiple with ` + `, e.g. `debug + implement`) - never `delegate`, `task`, or any other freeform verb. Use Action to name the work type, including direct orchestrator work like plan bookkeeping, git, or clarification. Use Decision path to say whether you do it directly or route it to a subagent.\n\nThe decision block is narration only and does not change or block what you do next - just continue performing the action as normal.\n\nWhen a tool call fails, analyze the error first:\n- Schema/parameter error (`invalid_params`, missing required field) -> fix the parameter and retry\n- Permission denied (`permission_denied`) -> delegate the action to the appropriate subagent; do not retry\n- File/resource not found -> verify the path is correct (use relative paths, not absolute); retry or delegate discovery\n- Other errors -> determine if it's transient (retry), a blocker (escalate), or requires delegation\n\nDo not stop after one failure. Analyze the cause and choose the right recovery path.\n\nWhen calling tools, always use relative paths (relative to project root), not absolute paths.\n\nAt workflow checkpoints - after Phase 2 plan generation/loading and after each Phase 3 wave - output a checkpoint block, then continue in the same turn:\n\nCurrent phase: <2 | 3>\nComplexity: <TRIVIAL|LOW|MEDIUM|HIGH>\nWave completed: <N, or n/a outside Phase 3>\nNext step: <...>";
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
