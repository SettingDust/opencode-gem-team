# OpenCode Gem Team Plugin

OpenCode Gem Team Plugin integrates the 16 canonical Gem Team agents into OpenCode through a plugin config hook. It syncs preserved upstream agent bodies into local generated artifacts, injects `gem-orchestrator` as the primary entry agent, and injects the remaining `gem-*` agents as subagents.

## Current status

| Area                         | Status           | Evidence boundary                                                                                                                                                                                                                               |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local package-path install   | Verified         | `opencode plugin E:\Projects\opencode-gem-team --force` in a temp fixture detected a server target and patched only the fixture `.opencode/opencode.json`. `opencode agent list` showed 16 `gem-*` agents.                                      |
| GitHub source install syntax | Format observed / end-to-end install Pending | A user-approved read-only inspection of the user's global OpenCode config observed a redacted plugin entry form: `"plugin": ["github:<owner>/<repo>#<ref>"]`. This does not prove this repo installs or loads from GitHub. |
| Package manager behavior     | Partial          | Official OpenCode docs state npm plugins are installed with Bun. CLI/source inspection shows path specs are treated as file plugins; non-path specs go through npm package resolution. GitHub package spec behavior is not end-to-end verified. |
| `dist` strategy              | Partial/Prepared | OpenCode package install detection requires `exports["./server"]` or `main`; those entries point to `dist/src/index.js`, so package-style installs require built `dist/src` files to exist.                                                     |
| AC-20 model request mutation | Partial/Pending  | Local tests prove only typed/mock `chat.params` `output.options.model` mutation. No real provider/API call was made, and actual runtime request model mutation is not claimed as verified.                                                      |

## Constraints

- No real AI provider/API calls are required for tests or local install PoC.
- Do not put provider credentials, API keys, or other secrets in this repo.
- Documentation and examples intentionally avoid concrete provider model IDs. Model values are opaque user-owned strings.
- The plugin does not implement provider-side routing, per-agent model overrides, role model maps, fallback chains, slash commands, telemetry, profiles, virtual models, or global OpenCode config writes.
- Newly injected generated agents do not receive default `model` fields. Existing user `agent.model` values win.
- Normal Gem Team routing now shows a short session-visible notification with the resolved model result through the session path, following the ACP-style shape `client.session.prompt(...)` with `noReply: true` and `parts: [{ type: "text", text, ignored: true }]`, rather than injecting ordinary chat context messages into model context.

## Development commands

```sh
npm install
npm run sync:agents
npm run validate:sync
npm test
npm run typecheck
npm run compile
npm run validate:dist
npm run validate:no-model-ids
npm run lint
```

`npm test` compiles first and runs Node's built-in test runner against `dist/test/**/*.test.js`.

The TypeScript build command is intentionally named `compile` instead of `build`: npm pacote treats a `build` script as git-dependency preparation work, which can make `opencode plugin --global github:SettingDust/opencode-gem-team` fail as `git dep preparation failed` in packaged OpenCode runtimes.

## Local development install

For local development, use a project fixture and a local package path. This patches only the fixture/project `.opencode/opencode.json` when run from that fixture:

```sh
npm run compile
opencode plugin /absolute/path/to/opencode-gem-team --force
opencode agent list
```

Expected local evidence: OpenCode detects a server target, writes a project-scoped plugin entry, and lists all 16 `gem-*` agents including primary `gem-orchestrator`.

## GitHub install caveat

The project goal remains GitHub-only distribution with no npm registry publish. However, an exact GitHub install command is **not documented here as final** because it has not been verified end-to-end without external publication/global config side effects. See `docs/installation-poc.md` for the evidence table and current safe boundary.

Observed OpenCode config syntax for GitHub plugin entries is:

```json
{
  "plugin": ["github:<owner>/<repo>#<ref>"]
}
```

For this repository, any command or config entry using that form remains an **unverified example** until a safe end-to-end GitHub install/load PoC proves remote loading, package-manager lifecycle behavior, and any committed-`dist` requirement.

## Configuration example

See `examples/opencode.json.example`. The optional `complexity_models` values are opaque placeholders and are not defaults or recommendations.
