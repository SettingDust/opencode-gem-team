# T01 PoC Report — OpenCode Gem Team Plugin Feasibility

Plan: `20260603-implement-opencode-gem-team-plugin`
Task: Phase 3 Wave 1 / `T01`
Date: 2026-06-03
Baseline: `ee708a8f9046b46054776345f05bf62b37b188d7`

## Environment

| Item | Observed value | Evidence |
| --- | --- | --- |
| OS shell | Windows / PowerShell 7 workspace | Command execution environment |
| Node.js | `v24.15.0` | `node --version` |
| npm | `11.12.1` | `npm --version` |
| Bun | `1.3.14` | `bun --version` |
| OpenCode CLI | `1.15.13` | `opencode --version` |
| Fixture package | `test/fixtures/minimal-plugin` | Existing local fixture |
| Plugin SDK package | `@opencode-ai/plugin@1.15.13` | `test/fixtures/minimal-plugin/package.json` and installed package metadata |

No provider/API call was made. No user global OpenCode config was written. Upstream GitHub access was limited to public documentation/source searches and did not mutate `mubaidr/gem-team` or any other upstream repository.

## Commands Run

```text
node --version
npm --version
bun --version
opencode --version
git rev-parse --is-inside-work-tree
git status --short
npm run typecheck
```

Additional read-only evidence collection used local file reads and public documentation/source searches for OpenCode plugin docs and SDK types.

## Findings

### 1. Current OpenCode plugin SDK type surface — Verified

`@opencode-ai/plugin@1.15.13` exports the types needed by this project:

- `PluginInput`
- `PluginOptions`
- `Config`
- `Plugin`
- `PluginModule`
- `Hooks`

The installed declaration file defines:

```ts
export type Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>

export type PluginModule = {
  id?: string
  server: Plugin
  tui?: never
}
```

This verifies the PRD-compatible default export shape: a default-exported object satisfying `PluginModule` with optional `id` and required `server` plugin factory.

### 2. Server hooks — Verified

The installed `Hooks` interface includes the needed hook names:

- `config`
- `chat.message`
- `chat.params`
- `chat.headers`
- `event`
- `tool.execute.before`
- `tool.execute.after`
- `tool.definition`
- `command.execute.before`
- `shell.env`
- `permission.ask`
- several `experimental.*` hooks

The minimal fixture typechecks a default export of:

```ts
export default {
  id: "opencode-gem-team-poc",
  server,
} satisfies PluginModule
```

and registers `config`, `chat.message`, and `chat.params` hooks without calling a provider.

### 3. Legacy function plugin shape — Verified, with caveat

Official docs describe local plugins as JavaScript/TypeScript modules exporting one or more plugin functions. The local skill reference and ecosystem examples also use function exports of type `Plugin`.

However, the installed SDK additionally provides `PluginModule { id?, server }`, and source-search evidence shows OpenCode runtime paths resolving `PluginModule` via `readV1Plugin` / `resolvePluginId`. For this repository, use the `PluginModule` default export as the primary shape because it is explicitly typed and matches PRD section 5.7.

### 4. Config hook injection feasibility — Verified locally by type contract

The `config` hook receives a mutable merged config object. The existing fixture typechecks mutation of `config.agent` and safe insertion of a PoC-only agent without model defaults.

Implication: later waves can inject the 16 `gem-*` agent definitions through `config`, while preserving any existing `agent[slug].model` by only setting missing fields or by merging without overwriting `model`.

### 5. Chat hooks and tier routing feasibility — Partial / limited

The SDK exposes `chat.message` and `chat.params` hooks:

- `chat.message` input includes `agent?`, `model?`, `messageID?`, `variant?`; output includes `message` and `parts`.
- `chat.params` input includes `agent`, `model`, `provider`, and `message`; output includes `temperature`, `topP`, `topK`, `maxOutputTokens`, and `options`.

The type contract verifies that `chat.params` can mutate provider/request `options`. It also verifies a key risk: the current `chat.params` output type does **not** expose a direct `model` field. A fixture `@ts-expect-error` confirms `output.model = ...` is not supported by the installed type surface.

Therefore, model tier routing is not fully proven as direct model mutation. It is feasible only as:

- config-time agent injection/preservation;
- chat-time metadata/options mutation;
- or a later OpenCode-specific implementation path if runtime source confirms a supported model override channel.

Later waves must not claim AC-20 as fully verified from T01 alone. Treat `chat.params` model mutation as a risk until a no-provider local runtime/mock proves actual request model replacement.

### 6. GitHub source installation path — Pending / not verified

Official OpenCode plugin docs currently document two plugin load/install paths:

1. local JavaScript/TypeScript files in `.opencode/plugins/` or `~/.config/opencode/plugins/`;
2. npm package names in `opencode.json` `plugin` array.

The docs state npm plugins are installed automatically using Bun at startup and cached in `~/.cache/opencode/node_modules/`. They do not document a GitHub source spec for plugin entries.

The config docs likewise show plugin entries as npm package strings, not GitHub repository specs.

Original T01 conclusion: GitHub source syntax for OpenCode plugin install remained **Pending** because official docs and CLI help did not document it.

Follow-up superseding evidence: a later user-approved read-only inspection of the user's global OpenCode config found a redacted GitHub plugin entry format: `"plugin": ["github:<owner>/<repo>#<ref>"]`. This supersedes the syntax-only finding to **Format observed / end-to-end install Pending**.

This follow-up preserves the historical PoC limitations: it does not prove this repository installs or loads from GitHub, does not prove package-manager or lifecycle behavior for GitHub specs, and does not prove whether committed `dist` is required. No global config was written, and no unrelated config or secrets are recorded here.

### 7. Package-manager involvement — Verified for documented npm/local paths; Pending for GitHub source

Official plugin docs state npm plugins are installed automatically using Bun at startup and cached in `~/.cache/opencode/node_modules/`. Local plugins are loaded directly; external packages for local plugins require a `package.json` in the config directory, and OpenCode runs `bun install` at startup for those dependencies.

For a hypothetical GitHub install source, package-manager involvement remains **Pending** because no GitHub source syntax was verified.

### 8. Whether `dist` must be committed — Pending

Evidence:

- `@opencode-ai/plugin` itself publishes only `dist` via package `files: ["dist"]` and package exports point to `./dist/index.js` plus `./dist/index.d.ts`.
- OpenCode docs support local `.ts`/`.js` plugin files loaded directly, meaning committed `dist` is not inherently required for local-file loading.
- Npm package plugin loading normally consumes the package entry/exports resolved by Bun/package manager; a package with exports pointing to `dist` needs built files in the installed package.
- GitHub source loading is not verified, so it is unknown whether OpenCode/Bun would install from source and run a prepare/build lifecycle, consume package exports, or require committed build output.

Conclusion: `needs_dist` is **pending**. Do not commit `dist` by default. Add an optional `dist` task only if GitHub install proof shows package exports require committed built files.

## Evidence

| Claim | Status | Evidence |
| --- | --- | --- |
| `@opencode-ai/plugin@1.15.13` installed | Verified | Fixture package and installed package metadata |
| `PluginModule { id?, server }` exists | Verified | Installed `dist/index.d.ts` lines defining `PluginModule` |
| `config` hook exists | Verified | Installed `Hooks` declaration and fixture typecheck |
| `chat.message` hook exists | Verified | Installed `Hooks` declaration and fixture typecheck |
| `chat.params` hook exists | Verified | Installed `Hooks` declaration and fixture typecheck |
| `chat.params` direct model mutation | Pending / risk | Output type lacks `model`; fixture uses `@ts-expect-error` for `output.model` |
| OpenCode supports npm plugin config entries | Verified | Official plugin/config docs |
| OpenCode supports local plugin files | Verified | Official plugin docs |
| OpenCode supports GitHub plugin source syntax | Format observed / end-to-end install Pending | Follow-up user-approved global config inspection observed redacted form `"plugin": ["github:<owner>/<repo>#<ref>"]`; T01 docs/CLI evidence still lacked end-to-end proof |
| Bun/package-manager participates in npm/local dependency path | Verified | Official docs state Bun installs npm plugins and local config dependencies |
| `dist` required for GitHub install | Pending | GitHub install mechanism unverified |

## Decisions

1. **Use `PluginModule` default export for implementation.**
   Rationale: It is present in the installed SDK, typechecks locally, and matches PRD 5.7.

2. **Implement config injection through the `config` hook.**
   Rationale: Hook exists and allows mutation of merged config. Later implementation must preserve existing `agent.model`.

3. **Treat `chat.params` model-tier routing as limited until runtime proof.**
   Rationale: The hook exists, but the current output type exposes request parameters/options, not a direct `model` assignment target.

4. **Do not publish final GitHub install syntax yet.**
   Rationale: Official docs found in T01 document local and npm plugins only.

5. **Do not commit `dist` by default.**
   Rationale: `needs_dist` remains pending and must follow verified loader/package-export/GitHub install behavior.

## Blocked / Pending

- Format observed / end-to-end Pending: GitHub plugin source syntax was later observed as `github:<owner>/<repo>#<ref>` in a redacted global config plugin array, but this repo has not been verified end-to-end from GitHub.
- Pending: whether OpenCode can install a plugin from a GitHub repository without npm registry publish.
- Pending: whether a GitHub source install uses Bun/package-manager resolution and lifecycle scripts.
- Pending: whether committed `dist` is necessary for GitHub source loading.
- Pending: local no-provider runtime/mock proof that a tier can replace the actual request model. Type evidence alone does not prove this.

## Implications for later waves

- T02 should scaffold TypeScript ESM around `PluginModule` default export.
- T07 should implement only config-time agent injection and must preserve native `agent.model`.
- T08 must include a stricter model-routing PoC/test. If no direct model override channel is proven, mark routing as limited/experimental and avoid claiming AC-20 verified.
- T09 docs must label GitHub install and `dist` status as Pending unless later evidence verifies them.
- T10 should be skipped unless later GitHub install proof makes committed build output necessary.
