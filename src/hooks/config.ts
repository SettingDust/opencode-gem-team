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

/**
 * Default tool permissions for gem-orchestrator only. Enforces the upstream
 * "delegation-first" contract at the permission layer instead of relying solely
 * on the prompt: the orchestrator cannot edit project files or run arbitrary
 * shell commands, so it is forced to delegate project work to subagents.
 *
 * Carve-outs preserve legitimate orchestration work:
 * - `edit` allows `docs/plan/**` so the orchestrator can persist plan/wave status.
 * - `bash` allows `git *` and `rtk git *` for the post-gate commit/diff steps.
 *   `rtk git *` is required because openrtk rewrites git commands before
 *   OpenCode's permission check. The carve-out stays limited to git only; we do
 *   not allow broader `rtk *` because that would bypass read/grep/list gating.
 * OpenCode evaluates the LAST matching rule, so broad rules are listed first and
 * narrow carve-outs last. There is no separate `write` permission key in OpenCode;
 * the `edit` rule gates both the `edit` and `write` tools.
 * read/grep/glob/list are intentionally omitted because OpenCode's global `*:
 * allow` baseline already permits them; the orchestrator only needs the two
 * hard deny-based locks (`edit`, `bash`) to enforce delegation-first, and reads
 * stay unrestricted (read-only, low risk, and the permission layer can't
 * distinguish evaluation reads from research anyway).
 */
const GEM_ORCHESTRATOR_PERMISSION: OpenCodePermissionConfig = {
  edit: { "*": "deny", "docs/plan/**": "allow" },
  bash: { "*": "deny", "git *": "allow", "rtk git *": "allow" },
}

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
