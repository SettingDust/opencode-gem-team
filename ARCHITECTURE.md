# Architecture

## Pattern Overview

**Overall:** Plugin-based hook injection with generated agent manifests

**Key Characteristics:**
- Use `src/index.ts` as the plugin entrypoint and expose OpenCode hooks from there.
- Load generated Gem Team agent definitions from `agents/generated/` through `src/agents/generated-loader.ts` and inject them into OpenCode config without replacing user-owned agent settings.
- Keep `gem-orchestrator` as the entry agent and prevent self-routing.

## Layers

**Plugin entry layer:**
- Purpose: Expose the OpenCode plugin interface.
- Location: `src/index.ts`
- Contains: The `server` plugin function and default export.
- Depends on: `src/hooks/config.ts`, `@opencode-ai/plugin` types.
- Used by: OpenCode plugin loading at runtime.

**Config injection layer:**
- Purpose: Merge generated Gem Team agents into OpenCode config.
- Location: `src/hooks/config.ts`
- Contains: `injectGemTeamAgents`, merge helpers, and orchestrator permission/prompt policy.
- Depends on: `src/agents/generated-loader.ts`, `src/types.ts`.
- Used by: The plugin entrypoint through the `config` hook.

**Generated agent loading layer:**
- Purpose: Read generated agent metadata and body content from disk.
- Location: `src/agents/generated-loader.ts`, `src/agents/generated.ts`, `agents/generated/`
- Contains: Manifest loading, frontmatter parsing, slug filtering, cached agent access, and orchestrator routing target lookup.
- Depends on: `agents/generated/manifest.json`, `agents/generated/gem-orchestrator.agent.md`, and the other generated Gem Team agent markdown files under `agents/generated/`.
- Used by: Config injection and sync validation.

**Sync and validation layer:**
- Purpose: Validate the generated manifest and guard against forbidden config/model content.
- Location: `src/sync/validation.ts`, `scripts/validate-sync.mjs`, `scripts/sync-agents.mjs`
- Contains: Manifest shape checks, slug checks, content safety checks, and sync assembly logic.
- Depends on: Upstream Gem Team agent markdown, canonical slug lists, generated manifest output.
- Used by: Sync scripts and validation tests.

**Support layer:**
- Purpose: Centralize shared constants and plugin type aliases.
- Location: `src/constants.ts`, `src/types.ts`, `src/agents/generated.ts`
- Contains: `PLUGIN_ID`, generated agent slug/count exports, and the minimal plugin configuration schema.
- Depends on: None beyond the plugin package types.
- Used by: The plugin entrypoint and test fixtures.

## Data Flow

**Agent Sync Pipeline:**

1. Fetch and normalize upstream Gem Team agents — `scripts/sync-agents.mjs`
2. Write generated agent markdown and `agents/generated/manifest.json` — `agents/generated/`
3. Validate the manifest, slugs, and forbidden content — `src/sync/validation.ts`, `scripts/validate-sync.mjs`

**Plugin Injection Pipeline:**

1. OpenCode loads the plugin entrypoint — `src/index.ts`
2. The `config` hook injects generated agents and preserves existing fields — `src/hooks/config.ts`
3. The loader resolves generated agents and routing targets from disk — `src/agents/generated-loader.ts`
4. The orchestrator receives the dedicated prompt notice and restricted permission rules — `src/hooks/config.ts`

## Key Abstractions

**GeneratedGemTeamAgent:**
- Purpose: Represent one generated agent entry with slug, mode, prompt, description, and routing targets.
- Location: `src/agents/generated-loader.ts`
- Pattern: Disk-backed manifest record with cached loading.

**OpenCodeConfigWithAgents:**
- Purpose: Model the OpenCode config shape that accepts injected agents.
- Location: `src/hooks/config.ts`, `src/types.ts`
- Pattern: Minimal config extension for agent injection.

**Gem Team manifest validation:**
- Purpose: Enforce canonical slugs, required metadata, and forbidden model/config dimensions.
- Location: `src/sync/validation.ts`
- Pattern: Fail-closed validation returning explicit errors.

**Orchestrator policy bundle:**
- Purpose: Attach the orchestrator prompt notice and permission restrictions.
- Location: `src/hooks/config.ts`
- Pattern: Special-case configuration overlay for `gem-orchestrator`.

## Entry Points

**Plugin server:**
- Location: `src/index.ts`
- Triggers: OpenCode plugin loading.
- Responsibilities: Register the config hook and expose the plugin surface.

**Agent sync command:**
- Location: `scripts/sync-agents.mjs`
- Triggers: `npm run sync:agents`
- Responsibilities: Pull upstream agent bodies and regenerate local artifacts.

**Sync validation command:**
- Location: `scripts/validate-sync.mjs`
- Triggers: `npm run validate:sync`
- Responsibilities: Verify the generated manifest and agent contents.

**Package guard commands:**
- Location: `scripts/validate-dist.mjs`, `scripts/validate-no-model-ids.mjs`, `scripts/validate-package-scripts.mjs`
- Triggers: `npm run validate:dist`, `npm run validate:no-model-ids`, `npm run validate:package-scripts`
- Responsibilities: Reject forbidden `dist/` content, model IDs, and package scripts that trigger git-dependency preparation.

## Error Handling

**Strategy:** Fail closed on manifest validation, preserve user-owned agent fields on merge, and keep routing targets empty when the orchestrator target is absent.

## Cross-Cutting Concerns

**Logging:** Keep logging outside the core injection path; use explicit script output for sync and validation commands.
**Caching:** Cache generated agent loading in `src/agents/generated-loader.ts` to avoid repeated disk reads.
**Storage:** Store generated agent bodies and manifest data under `agents/generated/`; keep build output under `dist/`.
