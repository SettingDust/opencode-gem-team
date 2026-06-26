import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js"

export type OpenCodePermissionAction = "ask" | "allow" | "deny"
export type OpenCodePermissionRule = OpenCodePermissionAction | Record<string, OpenCodePermissionAction>
export type OpenCodePermissionConfig = OpenCodePermissionAction | Record<string, OpenCodePermissionRule>

export type OpenCodeAgentConfig = {
  description?: string
  mode?: "primary" | "subagent" | "all" | string
  prompt?: string
  model?: string
  permission?: OpenCodePermissionConfig
  [key: string]: unknown
}

export type OpenCodeConfigWithAgents = {
  agent?: Record<string, OpenCodeAgentConfig | undefined>
  [key: string]: unknown
}

export const GEM_TEAM_AGENT_COUNT = 16 as const

const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator"

export const GEM_ORCHESTRATOR_PROMPT_NOTICE = `## IMPORTANT NOTICE about your workflow

You are the orchestrator. Before EVERY action - delegating via \`task\`, updating plan bookkeeping under \`docs/plan/*\`, running git, clarifying, or anything else - you MUST first output a decision block:

Phase: <current phase>
Action type: <delegate | plan-bookkeeping | git | clarify | ...>
Target: <gem-<slug> when delegating, otherwise the file or command>
Reasoning: <why this action and target fit the current phase and your workflow/role>

Only after emitting this block may you act. Acting without a verbalized decision block is a workflow violation.

When a tool call fails, analyze the error first:
- Schema/parameter error (\`invalid_params\`, missing required field) -> fix the parameter and retry
- Permission denied (\`permission_denied\`) -> delegate the action to the appropriate subagent; do not retry
- File/resource not found -> verify the path is correct (use relative paths, not absolute); retry or delegate discovery
- Other errors -> determine if it's transient (retry), a blocker (escalate), or requires delegation

Do not silently give up after one failure. Think through the cause and choose the appropriate recovery path.

When calling tools, always use relative paths (relative to project root), not absolute paths - this ensures permission patterns match correctly.

At workflow checkpoints, output a checkpoint block before proceeding:

After Phase 2 (plan generated or loaded):
Current phase: 2
Complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
Next step: <...>

After Phase 3 wave completion:
Current phase: 3
Wave completed: <N>
Complexity: <MEDIUM|HIGH>
Next step: <...>`
// Default tool permissions for gem-orchestrator only. Enforces delegation-first
// at the permission layer instead of relying solely on the prompt: the
// orchestrator cannot edit project source or run arbitrary shell commands, so it
// is forced to delegate project work to subagents.
//
// Carve-outs preserve legitimate orchestration work only:
// - `edit` allows `docs/plan/*` so the orchestrator can persist plan/wave status.
// - `bash` allows `git *` and `rtk git *` for the post-gate commit/diff steps.
// - `read` is strictly denied everywhere except orchestration artifacts:
//   `docs/plan/*`, `**/.gem-team.yaml`, and `**/AGENTS.md`.
// - `grep`/`glob` are guarded by a runtime plugin hook instead of permission
//   injection, and only allow `docs/plan/**` for gem-orchestrator.
//
// Use `deny`, not `ask`: `ask` would block the turn with an interactive prompt
// that can abort the conversation if rejected, while `deny` returns
// `permission_denied` cleanly so the orchestrator can continue by delegating.
// OpenCode evaluates the LAST matching rule, so broad rules are listed first and
// narrow carve-outs last. There is no separate `write` permission key in OpenCode;
// the `edit` rule gates both the `edit` and `write` tools.
// `read` is also implicitly covered by OpenCode's default `.env` deny; the `*`
// `deny` baseline already covers that too.
const GEM_ORCHESTRATOR_PERMISSION: OpenCodePermissionConfig = { edit: { "*": "deny", "docs/plan/*": "allow" }, bash: { "*": "deny", "git *": "allow", "rtk git *": "allow" }, read: { "*": "deny", "docs/plan/*": "allow", "**/.gem-team.yaml": "allow", "**/AGENTS.md": "allow" } }

export function injectGemTeamAgents(config: OpenCodeConfigWithAgents): void {
  config.agent ??= {}

  for (const generated of getGeneratedGemTeamAgents()) {
    const existing = config.agent[generated.slug]
    const base: OpenCodeAgentConfig = {
      description: generated.description,
      mode: generated.mode,
      prompt: generated.prompt,
    }

    if (generated.slug === GEM_ORCHESTRATOR_SLUG) {
      base.permission = GEM_ORCHESTRATOR_PERMISSION
      base.prompt = generated.prompt ? `${generated.prompt}\n\n${GEM_ORCHESTRATOR_PROMPT_NOTICE}` : GEM_ORCHESTRATOR_PROMPT_NOTICE
    }

    config.agent[generated.slug] = existing ? mergeMissingAgentFields(existing, base) : base
  }
}

export { getGemOrchestratorRoutingTargets }

function mergeMissingAgentFields(existing: OpenCodeAgentConfig, generated: OpenCodeAgentConfig): OpenCodeAgentConfig {
  const merged: OpenCodeAgentConfig = {
    ...generated,
    ...existing,
  }

  // Permission needs a per-key merge instead of a whole-field override. A shallow
  // `{ ...generated, ...existing }` lets any user-defined `permission` block (even
  // a single MCP-tool deny) silently drop the injected delegation-first defaults
  // (edit/bash/read/...). Merge per tool key so user-specified keys win while
  // injected defaults fill the keys the user did not set.
  const mergedPermission = mergePermission(generated.permission, existing.permission)
  if (mergedPermission !== undefined) {
    merged.permission = mergedPermission
  }

  return merged
}

/**
 * Per-key permission merge. User-specified keys take precedence; injected
 * defaults fill the rest. Falls back to whole-value override when either side is
 * a flat action string (e.g. "allow"/"deny"), since a per-key merge is undefined
 * against a flat action and the user's explicit value should win.
 */
function mergePermission(
  generated: OpenCodePermissionConfig | undefined,
  existing: OpenCodePermissionConfig | undefined,
): OpenCodePermissionConfig | undefined {
  if (existing === undefined) return generated
  if (generated === undefined) return existing
  if (typeof generated !== "object" || typeof existing !== "object") return existing
  return { ...generated, ...existing }
}
