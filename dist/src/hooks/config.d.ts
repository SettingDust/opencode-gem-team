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
export declare const GEM_ORCHESTRATOR_PROMPT_NOTICE = "## IMPORTANT NOTICE about your workflow\n\nYou are the orchestrator. Before EVERY action - delegating via `task`, updating plan bookkeeping under `docs/plan/*`, running git, clarifying, or anything else - you MUST first output a decision block, then carry out that action in the SAME turn:\n\nPhase: <current phase>\nComplexity: <TRIVIAL|LOW|MEDIUM|HIGH>\nAction: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>\nDecision path: <...>\n\nAction MUST be one or more of the values listed above (combine multiple with ` + `, e.g. `debug + implement`) - never `delegate`, `task`, or any other freeform verb. The Action names the kind(s) of work; even when you handle plan bookkeeping, git, clarifying, or other direct orchestrator work yourself, map it to these agent verbs. The Decision path states whether you handle it directly or route it to a subagent.\n\nThe decision block is a PREFACE, never the deliverable, and is worthless on its own. Ending the turn right after a decision block without a tool call, `task` delegation, or command in the same turn is a critical workflow violation. The decision block and the action it describes are a SINGLE inseparable unit: the very next thing after the block MUST be the actual tool call.\n\nCorrect pattern:\nPhase: 0\nComplexity: LOW\nAction: research\nDecision path: delegate to gem-researcher to read X\n[then IMMEDIATELY call task() in the same turn - do not stop here]\n\nNever output a decision block as your final message. If you have emitted a block, you have NOT finished your turn - you must still perform the action.\n\nWhen a tool call fails, analyze the error first:\n- Schema/parameter error (`invalid_params`, missing required field) -> fix the parameter and retry\n- Permission denied (`permission_denied`) -> delegate the action to the appropriate subagent; do not retry\n- File/resource not found -> verify the path is correct (use relative paths, not absolute); retry or delegate discovery\n- Other errors -> determine if it's transient (retry), a blocker (escalate), or requires delegation\n\nDo not silently give up after one failure. Think through the cause and choose the appropriate recovery path.\n\nWhen calling tools, always use relative paths (relative to project root), not absolute paths - this ensures permission patterns match correctly.\n\nAt workflow checkpoints - after the Phase 2 plan is generated or loaded, and after each Phase 3 wave completes - output a checkpoint block, then continue in the same turn:\n\nCurrent phase: <2 | 3>\nComplexity: <TRIVIAL|LOW|MEDIUM|HIGH>\nWave completed: <N, or n/a outside Phase 3>\nNext step: <...>";
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
