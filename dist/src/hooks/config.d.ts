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
export declare const GEM_ORCHESTRATOR_PROMPT_NOTICE = "## IMPORTANT NOTICE about your tools\n\nYou are the orchestrator. Your `edit` and `bash` tools are intentionally restricted to enforce delegation-first orchestration \u2014 this is by design, not a malfunction:\n\n- `edit` is DENIED on all paths except `docs/plan/**` (plan/wave status bookkeeping). You CANNOT edit project source (`src/`, agent definitions, configs, tests). Do not retry a denied edit \u2014 delegate it.\n- `bash` is DENIED except `git *` (and `rtk git *`). You CANNOT run arbitrary shell commands. Do not retry a denied command \u2014 delegate it or use a dedicated read-only tool.\n- Reading (`read`/`grep`/`glob`/`list`) is unrestricted \u2014 use it freely for Phase 0 evaluation.\n\nWhen you need to change project code, write files outside `docs/plan/**`, or run non-git commands, that is project work: delegate it to the appropriate subagent (e.g. `gem-implementer`) via the `task` tool. A `permission_denied` result is the expected signal to delegate, not an error to work around.";
export declare function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void;
export { getGemOrchestratorRoutingTargets };
