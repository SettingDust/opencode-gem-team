# Installation PoC Evidence

Date: 2026-06-03
OpenCode CLI observed locally: 1.15.13

## Summary

This document records only evidence that was obtained without real provider/API calls, without reading or printing environment secrets, and without writing global OpenCode config. Temp fixture writes were limited to `C:\Users\WINDOWS\AppData\Local\Temp\opencode\gem-team-plugin-local-poc`. A later user-approved read-only global OpenCode config inspection is recorded only as redacted plugin array evidence and does not include unrelated config or secrets.

## Evidence table

| Topic                         | Status           | Evidence                                                                                                                                                                                                                       | Limitation                                                                                                                     |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Local package-path install    | Verified         | `opencode plugin E:\Projects\opencode-gem-team --force` from the temp fixture succeeded after adding `main` and `exports["./server"]`; OpenCode reported `Detected server target` and wrote fixture `.opencode/opencode.json`. | This verifies a local path/package install, not remote GitHub installation.                                                    |
| Local agent visibility        | Verified         | `opencode agent list` in the fixture emitted 16 lines beginning with `gem-`; `gem-orchestrator` appeared as primary and other generated agents as subagents.                                                                   | Output was large because OpenCode prints merged permissions; only the count/agent names are used as evidence.                  |
| OpenCode plugin docs          | Verified         | Official docs at `https://opencode.ai/docs/plugins/` document local plugin directories, npm plugin config entries, Bun-installed npm plugins, and local dependency behavior.                                                   | The docs page did not provide a verified GitHub source plugin syntax.                                                          |
| CLI plugin command            | Verified         | `opencode plugin --help` describes the positional module as `npm module name`. Local source inspection shows the command can also resolve path specs.                                                                          | Help text does not document GitHub source syntax.                                                                              |
| Package target detection      | Verified         | OpenCode source inspection of `readPluginManifest` expects one of `exports["./tui"]`, `exports["./server"]`, package `main`, or `oc-themes`; the first local install attempt failed until this repo exposed a server target.   | Source was inspected from public GitHub mirrors/source, not by modifying OpenCode itself.                                      |
| Package manager behavior      | Partial          | Official docs say npm plugins are installed automatically using Bun and cached under the OpenCode cache. Source inspection shows non-path plugin specs are sent to package resolution, while path specs are file plugins.      | GitHub package spec handling was not verified end-to-end against a published remote repository.                                |
| GitHub source syntax          | Format observed / end-to-end install Pending | User-approved read-only inspection of the user's global OpenCode config found a plugin entry string with redacted form `"plugin": ["github:<owner>/<repo>#<ref>"]`. | This proves only an observed config entry format. It does not prove this repo installs or loads from GitHub, nor package-manager lifecycle or dist behavior. Do not publish a final command. |
| `dist` need                   | Partial/Prepared | Because this package's package entrypoints point to `./dist/src/index.js`, package-style installs require `dist/src` to exist. `npm run compile` creates it and `npm run validate:dist` checks package exports and import smoke. | Whether GitHub remote install specifically needs committed `dist/src` remains dependent on the unverified GitHub install path. |
| Git dependency lifecycle prep | Fixed in package shape | The GitHub install failure was caused by npm pacote treating `package.json` `scripts.build` as a git-dependency preparation trigger and attempting an inner `npm install` spawn during OpenCode plugin installation. The script is now named `compile`, and `npm run validate:package-scripts` rejects `build`, `prepare`, `prepack`, `preinstall`, `install`, and `postinstall`. | This package-side fix avoids the known pacote prep trigger; remote install/load should still be re-run after publishing the changed package shape. |

## Dist strategy decision

The repo now exposes OpenCode-compatible package entrypoints via `main` and `exports["./server"]`, both targeting built `dist/src/index.js`. This is required for OpenCode package target detection in local path/package install mode.

`dist/src` is prepared for inclusion by `.gitignore`, and `npm run validate:dist` gates:

- package entrypoints target `./dist/src/*`;
- required built entrypoint and declaration files exist;
- `dist/src/index.js` can be imported and exposes a PluginModule-like object with an id and server function;
- dist source output has no obvious secret-like API key assignments, provider-style model assignments, or deleted routing modules.

The project still does **not** claim that GitHub source install is fully verified. If a later GitHub PoC proves a different package manager path, this strategy should be revised with new evidence.

## Safe install guidance boundary

Verified local development path:

```sh
npm run compile
opencode plugin /absolute/path/to/opencode-gem-team --force
opencode agent list
```

Observed GitHub source entry format:

```json
{
  "plugin": ["github:<owner>/<repo>#<ref>"]
}
```

Pending remote path:

- end-to-end install/load of this repository using the observed GitHub source syntax;
- whether OpenCode/Bun runs package lifecycle/build steps for GitHub specs;
- whether committed `dist/src` is sufficient or required for remote GitHub installs.

Do not use this document to infer a final GitHub install command. The observed syntax is safe redacted evidence from global config inspection only; it is not a verified install/load result for this repository.
