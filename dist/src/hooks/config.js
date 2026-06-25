import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js";
export const GEM_TEAM_AGENT_COUNT = 16;
const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator";
export const GEM_ORCHESTRATOR_PROMPT_NOTICE = [
    "## IMPORTANT NOTICE about your tools",
    "",
    "You are the orchestrator. Your `edit` and `bash` tools are intentionally restricted to enforce delegation-first orchestration — this is by design, not a malfunction:",
    "",
    "- `edit` is DENIED on all paths except `docs/plan/**` (plan/wave status bookkeeping). You CANNOT edit project source (`src/`, agent definitions, configs, tests). Do not retry a denied edit — delegate it.",
    "- `bash` is DENIED except `git *` (and `rtk git *`). You CANNOT run arbitrary shell commands. Do not retry a denied command — delegate it or use a dedicated read-only tool.",
    "- Reading (`read`/`grep`/`glob`/`list`) is limited to orchestration artifacts (plan/bookkeeping/config/conventions); do not expect project-source reads to work here.",
    "",
    "When you need to change project code, write files outside `docs/plan/**`, or run non-git commands, that is project work: delegate it to the appropriate subagent (e.g. `gem-implementer`) via the `task` tool. A `permission_denied` result is the expected signal to delegate, not an error to work around.",
].join('\n');
// Default tool permissions for gem-orchestrator only. Enforces delegation-first
// at the permission layer instead of relying solely on the prompt: the
// orchestrator cannot edit project source or run arbitrary shell commands, so it
// is forced to delegate project work to subagents.
//
// Carve-outs preserve legitimate orchestration work only:
// - `edit` allows `docs/plan/**` so the orchestrator can persist plan/wave status.
// - `bash` allows `git *` and `rtk git *` for the post-gate commit/diff steps.
// - `read`/`grep`/`glob` are strictly denied everywhere except orchestration
//   artifacts: `docs/plan/**`, `**/.gem-team.yaml`, and `**/AGENTS.md`.
//
// Use `deny`, not `ask`: `ask` would block the turn with an interactive prompt
// that can abort the conversation if rejected, while `deny` returns
// `permission_denied` cleanly so the orchestrator can continue by delegating.
// OpenCode evaluates the LAST matching rule, so broad rules are listed first and
// narrow carve-outs last. There is no separate `write` permission key in OpenCode;
// the `edit` rule gates both the `edit` and `write` tools.
// `read` is also implicitly covered by OpenCode's default `.env` deny; the `*`
// `deny` baseline already covers that too.
const GEM_ORCHESTRATOR_PERMISSION = { edit: { "*": "deny", "docs/plan/**": "allow" }, bash: { "*": "deny", "git *": "allow", "rtk git *": "allow" }, read: { "*": "deny", "docs/plan/**": "allow", "**/.gem-team.yaml": "allow", "**/AGENTS.md": "allow" }, grep: { "*": "deny", "docs/plan/**": "allow" }, glob: { "*": "deny", "docs/plan/**": "allow" } };
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
            base.prompt = generated.prompt ? `${generated.prompt}\n\n${GEM_ORCHESTRATOR_PROMPT_NOTICE}` : GEM_ORCHESTRATOR_PROMPT_NOTICE;
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