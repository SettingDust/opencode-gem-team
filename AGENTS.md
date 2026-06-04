# AGENTS.md

> Repo guidance for agents working on the OpenCode Gem Team plugin.

## Project at a glance

- **Purpose:** OpenCode plugin that exposes the 16 canonical Gem Team agents and preserves upstream Gem Team orchestration semantics.
- **Source of truth:** `docs/PRD.md`
- **Main code paths:** `src/`
- **Generated artifacts:** `dist/`, `src/agents/generated.*`

## What this repo is doing

- Syncs upstream agent bodies from `mubaidr/gem-team/.apm/agents/*.agent.md`.
- Registers the canonical `gem-*` agents in OpenCode.
- Keeps `gem-orchestrator` as the entry agent, but never as its own child/subagent.
- Resolves model tiers through the priority chain:

```text
OpenCode agent.model > plugin complexity_models[tier] > current selected model
```

- Uses an ACP-like session notice for routing decisions:
  - `client.session.prompt(...)`
  - `noReply: true`
  - ignored text part
  - English-only decision summary

## Key invariants

- Do **not** add `role_models`, `agent_complexity_models`, per-agent model overrides, or provider-side routing.
- Do **not** hardcode concrete model IDs in docs or code examples.
- Do **not** switch production notices to `client.tui.showToast` or `chat.message`.
- Do **not** let generated defaults override an existing user `agent.model`.
- Do **not** let `gem-orchestrator` route to itself.
- Preserve upstream agent behavior; only do OpenCode-compatible conversion.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Plugin entrypoint |
| `src/hooks/` | OpenCode hook implementations |
| `src/routing/` | Complexity/tier resolution helpers |
| `src/agents/` | Generated agent manifests/loaders |
| `src/sync/` | Sync validation helpers |
| `scripts/` | Validation/sync scripts |
| `docs/PRD.md` | Product requirements |
| `docs/installation-poc.md` | Installation PoC evidence and boundaries |
| `examples/opencode.json.example` | Example OpenCode plugin config |
| `test/` | Node test coverage for routing, sync, config, and package-scripts |

## Working commands

```sh
npm install
npm run sync:agents
npm run validate:sync
npm test
npm run typecheck
npm run compile
npm run lint
npm run validate:dist
npm run validate:no-model-ids
```

### Notes on scripts

- `npm test` runs `npm run compile` first, then Node tests from `dist/test/**/*.test.js`.
- The build command is intentionally named `compile`, not `build`.
- `npm run validate:package-scripts` exists to prevent scripts that trigger git-dependency prep in packaged installs.

## Documentation boundaries

- `README.md` is for human-facing usage and setup.
- `AGENTS.md` is for agents: keep it terse, factual, and synced to actual repo behavior.
- If code and docs diverge, trust code/tests + `docs/PRD.md`, then update docs.

## When changing behavior

1. Update code.
2. Update or add tests.
3. Run the verification commands above.
4. Update `docs/PRD.md` only if product behavior changed.
5. Keep `README.md` and `AGENTS.md` consistent with the verified state.

## Safety reminders

- Never commit secrets, tokens, or provider credentials.
- Avoid inventing final GitHub install claims unless they are end-to-end verified.
- Keep generated artifacts aligned with the sync manifest and validation scripts.
