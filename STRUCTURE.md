# Codebase Structure

## Directory Layout

```text
opencode-gem-team/
├── agents/                 # Generated Gem Team agent sources and manifest data under `agents/generated/`
├── docs/                   # PRD, PoC evidence, and planning artifacts
├── examples/               # Example OpenCode configuration
├── scripts/                # Sync and validation scripts
├── src/                    # Plugin runtime, hooks, generated loaders, and validation helpers in `src/agents/`, `src/hooks/`, and `src/sync/`
├── test/                   # Node test coverage and fixtures under `test/fixtures/`
├── dist/                   # Compiled output for package-style installs
├── package.json            # npm scripts and package entrypoints
├── package-lock.json       # Locked dependency graph
└── tsconfig.json           # TypeScript compiler settings
```

## Directory Purposes

**`agents/`:**
- Purpose: Keep generated Gem Team agent markdown and the sync manifest.
- Contains: Generated `.agent.md` files and `manifest.json` under `agents/generated/`.
- Key files: `agents/generated/manifest.json`, `agents/generated/gem-orchestrator.agent.md`

**`docs/`:**
- Purpose: Hold product requirements and install evidence.
- Contains: PRD, PoC notes, and plan artifacts.
- Key files: `docs/PRD.md`, `docs/installation-poc.md`

**`examples/`:**
- Purpose: Show a minimal OpenCode plugin configuration.
- Contains: Example config files.
- Key files: `examples/opencode.json.example`

**`scripts/`:**
- Purpose: Regenerate generated agents and validate repository invariants.
- Contains: Node-based sync and validation scripts.
- Key files: `scripts/sync-agents.mjs`, `scripts/validate-sync.mjs`, `scripts/validate-dist.mjs`, `scripts/validate-no-model-ids.mjs`, `scripts/validate-package-scripts.mjs`

**`src/`:**
- Purpose: Implement the OpenCode plugin runtime.
- Contains: Plugin entrypoint, hooks, generated-agent loader, sync validation helpers, constants, and types.
- Key files: `src/index.ts`, `src/hooks/config.ts`, `src/agents/generated-loader.ts`, `src/agents/generated.ts`, `src/sync/validation.ts`, `src/constants.ts`, `src/types.ts`

**`test/`:**
- Purpose: Verify sync behavior, plugin shape, config injection, and script guards.
- Contains: Node test files and fixtures.
- Key files: `test/sync-agents.test.ts`, `test/sync-validation.test.ts`, `test/plugin-config.test.ts`, `test/plugin-shape.test.ts`, `test/validate-dist.test.ts`, `test/package-scripts.test.ts`

**`dist/`:**
- Purpose: Store compiled JavaScript and declaration output for packaged installs.
- Contains: Build artifacts from TypeScript compilation.
- Key files: `dist/src/index.js`, `dist/src/index.d.ts`

## Key File Locations

**Entry Points:** `src/index.ts` — OpenCode plugin entrypoint that registers the config hook.

**Configuration:** `package.json` — npm scripts, package entrypoints, and dependency declarations.

**Core Logic:** `src/hooks/config.ts` — Injects generated agents and applies the orchestrator policy overlay.

**Sync Logic:** `scripts/sync-agents.mjs` — Regenerates generated agent files and manifest data.

**Validation:** `src/sync/validation.ts` — Validates manifest shape, canonical slugs, and forbidden content.

**Tests:** `test/sync-agents.test.ts`, `test/sync-validation.test.ts`, `test/plugin-config.test.ts`, `test/plugin-shape.test.ts`, `test/validate-dist.test.ts`, `test/package-scripts.test.ts` — Repository coverage for sync, config, plugin shape, and script guards.

## Naming Conventions

**Files:** Use descriptive lowercase names with dots for role-based extensions, such as `src/hooks/config.ts` and `examples/opencode.json.example`.

**Directories:** Use purpose-based lowercase directory names, such as `src/hooks/`, `src/agents/`, `scripts/`, and `test/`.

## Where to Add New Code

**New hook behavior:** Add it under `src/hooks/` and keep the existing config-injection style from `src/hooks/config.ts`.

**New sync or validation script:** Add it under `scripts/` and follow the standalone Node script pattern used by `scripts/sync-agents.mjs`.

**New generated-agent support:** Add loader or manifest logic under `src/agents/` and keep generated artifacts in `agents/generated/`.

**New shared plugin types or constants:** Add them to `src/types.ts` or `src/constants.ts`.

**New tests:** Add `*.test.ts` files under `test/` and use `test/fixtures/` for fixture projects.
