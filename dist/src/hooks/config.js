import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js";
export const GEM_TEAM_AGENT_COUNT = 16;
const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator";
/**
 * Default tool permissions for gem-orchestrator only. Enforces the upstream
 * "delegation-first" contract at the permission layer instead of relying solely
 * on the prompt: the orchestrator cannot edit project files or run arbitrary
 * shell commands, so it is forced to delegate project work to subagents.
 *
 * Carve-outs preserve legitimate orchestration work:
 * - `edit` allows `docs/plan/**` so the orchestrator can persist plan/wave status.
 * - `bash` allows `git *` for the post-gate commit/diff steps.
 * - read/grep/glob/list default to `ask` so the orchestrator can silently read
 *   its own orchestration surface (plan files, .gem-team.yaml, docs/, AGENTS.md)
 *   but must prompt the user before reading anything else. Exploratory reads
 *   cannot be hard-denied because Phase 0 assessment shares the same tools as
 *   deep research; `ask` surfaces the attempt and lets the user act as a rate
 *   limiter, since self-driven research needs many reads in a row.
 *
 * OpenCode evaluates the LAST matching rule, so broad rules are listed first and
 * narrow carve-outs last. There is no separate `write` permission key in OpenCode;
 * the `edit` rule gates both the `edit` and `write` tools.
 */
const GEM_ORCHESTRATOR_PERMISSION = {
    edit: { "*": "deny", "docs/plan/**": "allow" },
    bash: { "*": "deny", "git *": "allow" },
    read: {
        "*": "ask",
        "docs/**": "allow",
        "**/.gem-team.yaml": "allow",
        "AGENTS.md": "allow",
    },
    grep: { "*": "ask", "docs/plan/**": "allow" },
    glob: { "*": "ask", "docs/plan/**": "allow" },
    list: { "*": "ask", "docs/plan/**": "allow" },
};
export function injectGemTeamAgents(config) {
    config.agent ??= {};
    for (const generated of getGeneratedGemTeamAgents()) {
        const existing = config.agent[generated.slug];
        const base = {
            description: generated.description,
            mode: generated.mode,
            prompt: generated.prompt,
        };
        if (generated.slug === GEM_ORCHESTRATOR_SLUG) {
            base.permission = GEM_ORCHESTRATOR_PERMISSION;
        }
        config.agent[generated.slug] = existing ? mergeMissingAgentFields(existing, base) : base;
    }
}
export { getGemOrchestratorRoutingTargets };
function mergeMissingAgentFields(existing, generated) {
    const merged = {
        ...generated,
        ...existing,
    };
    // Permission needs a per-key merge instead of a whole-field override. A shallow
    // `{ ...generated, ...existing }` lets any user-defined `permission` block (even
    // a single MCP-tool deny) silently drop the injected delegation-first defaults
    // (edit/bash/read/...). Merge per tool key so user-specified keys win while
    // injected defaults fill the keys the user did not set.
    const mergedPermission = mergePermission(generated.permission, existing.permission);
    if (mergedPermission !== undefined) {
        merged.permission = mergedPermission;
    }
    return merged;
}
/**
 * Per-key permission merge. User-specified keys take precedence; injected
 * defaults fill the rest. Falls back to whole-value override when either side is
 * a flat action string (e.g. "allow"/"deny"), since a per-key merge is undefined
 * against a flat action and the user's explicit value should win.
 */
function mergePermission(generated, existing) {
    if (existing === undefined)
        return generated;
    if (generated === undefined)
        return existing;
    if (typeof generated !== "object" || typeof existing !== "object")
        return existing;
    return { ...generated, ...existing };
}
//# sourceMappingURL=config.js.map