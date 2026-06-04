# OpenCode Gem Team Plugin

OpenCode Gem Team Plugin integrates the 16 canonical Gem Team agents into OpenCode.

It:

- syncs the upstream agent bodies from `mubaidr/gem-team/.apm/agents/*.agent.md`
- registers the canonical `gem-*` agents in OpenCode
- keeps `gem-orchestrator` as the entry agent, but never as its own child/subagent
- resolves model tiers through the priority chain:

```text
OpenCode agent.model > plugin complexity_models[tier] > current selected model
```

## What this repo is for

- GitHub-first OpenCode plugin distribution
- local development and validation of Gem Team agent syncs
- OpenCode-compatible model-tier routing without per-agent model maps
- preserving upstream Gem Team orchestration semantics

## Current repo facts

| Area | Status | Notes |
| --- | --- | --- |
| Local package-path install | Verified | `opencode plugin E:\Projects\opencode-gem-team --force` works in a temp fixture and lists 16 `gem-*` agents. |
| GitHub source install syntax | Format observed / end-to-end install pending | A redacted config observation showed `"plugin": ["github:<owner>/<repo>#<ref>"]`, but this repo has not been verified end-to-end through that path yet. |
| `dist` strategy | Prepared | Package entrypoints point to `./dist/src/index.js`, so package-style installs require built `dist/src` files. |
| AC-20 model request mutation | Partial | Tests prove typed/mock routing; real provider/API request mutation is still not claimed as verified. |

## Installation

### Local development

```sh
npm install
npm run compile
opencode plugin /absolute/path/to/opencode-gem-team --force
opencode agent list
```

Expected result: OpenCode detects a server target, patches the local fixture config, and lists all 16 `gem-*` agents including `gem-orchestrator`.

### GitHub distribution boundary

The project is intended for GitHub-only distribution. An end-to-end GitHub install/load path is still bounded by the PoC evidence in `docs/installation-poc.md`, so this README does **not** document a final GitHub install command as verified production guidance.

## Configuration

Example config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "/absolute/path/to/opencode-gem-team",
      {
        "complexity_models": {
          "simple": "opaque-simple-model",
          "medium": "opaque-medium-model",
          "complex": "opaque-complex-model"
        }
      }
    ]
  ]
}
```

Notes:

- `complexity_models.*` are optional.
- Existing OpenCode `agent.model` values always win.
- The plugin does not define per-agent overrides, role model maps, or provider-side routing.

## Development commands

```sh
npm run sync:agents
npm run validate:sync
npm test
npm run typecheck
npm run compile
npm run lint
npm run validate:dist
npm run validate:no-model-ids
```

`npm test` compiles first and runs Node tests from `dist/test/**/*.test.js`.

The build command is named `compile` instead of `build` because npm pacote treats `build` as git-dependency preparation work, which previously caused GitHub-install failures in packaged OpenCode runtimes.

## Constraints

- No real provider/API calls are required for tests or local install PoC.
- Do not add secrets, tokens, or provider credentials to this repo.
- Do not hardcode concrete model IDs in docs or examples.
- Do not add `role_models`, `agent_complexity_models`, per-agent overrides, fallback chains, slash commands, telemetry, profiles, virtual models, or provider-side routers.
- Do not switch production notices to `client.tui.showToast` or `chat.message`.
- Keep production routing notices ACP-like via `client.session.prompt(...)` with English-only decision info.

## Docs for agents

If you are an AI agent working in this repo, read `AGENTS.md` first.

## Related docs

- `docs/PRD.md` — product requirements
- `docs/installation-poc.md` — PoC evidence and boundaries
- `examples/opencode.json.example` — sample config
