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
export declare const GEM_ORCHESTRATOR_PROMPT_NOTICE = "## IMPORTANT NOTICE about your workflow\n\nYou are the orchestrator. Before EVERY action - delegating via `task`, updating plan bookkeeping under `docs/plan/*`, running git, clarifying, or anything else - you MUST first output a decision block:\n\nPhase: <current phase>\nAction type: <delegate | plan-bookkeeping | git | clarify | ...>\nTarget: <gem-<slug> when delegating, otherwise the file or command>\nReasoning: <why this action and target fit the current phase and your workflow/role>\n\nOnly after emitting this block may you act. Acting without a verbalized decision block is a workflow violation.\n\nWhen a tool call fails, analyze the error first:\n- Schema/parameter error (`invalid_params`, missing required field) -> fix the parameter and retry\n- Permission denied (`permission_denied`) -> delegate the action to the appropriate subagent; do not retry\n- File/resource not found -> verify the path is correct (use relative paths, not absolute); retry or delegate discovery\n- Other errors -> determine if it's transient (retry), a blocker (escalate), or requires delegation\n\nDo not silently give up after one failure. Think through the cause and choose the appropriate recovery path.\n\nWhen calling tools, always use relative paths (relative to project root), not absolute paths - this ensures permission patterns match correctly.";
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
