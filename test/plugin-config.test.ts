import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { describe, it } from "node:test"

import plugin from "../src/index.js"
import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../src/agents/generated-loader.js"
import { GEM_ORCHESTRATOR_PROMPT_NOTICE, GEM_TEAM_AGENT_COUNT, injectGemTeamAgents, type OpenCodeConfigWithAgents } from "../src/hooks/config.js"
import { createGemOrchestratorToolGuard } from "../src/hooks/tool-guard.js"
import { CANONICAL_GEM_TEAM_SLUGS } from "../src/sync/validation.js"

describe("Gem Team config hook injection", () => {
  it("initializes missing config.agent and injects exactly 16 generated agents", () => {
    const config: OpenCodeConfigWithAgents = {}

    injectGemTeamAgents(config)

    assert.ok(config.agent)
    assert.deepEqual(Object.keys(config.agent), [...CANONICAL_GEM_TEAM_SLUGS])
    assert.equal(Object.keys(config.agent).length, GEM_TEAM_AGENT_COUNT)
  })

  it("uses the plugin config hook to inject agents", async () => {
    const hooks = await plugin.server({ client: { session: { get: async () => ({ data: {}, error: undefined, request: {} as never, response: {} as never }) } }, directory: "." } as never, { complexity_models: { medium: "legacy-tier-model" } })
    const config: OpenCodeConfigWithAgents = {}

    await hooks.config?.(config as never)

    assert.equal(Object.keys(config.agent ?? {}).length, GEM_TEAM_AGENT_COUNT)
    assert.ok(config.agent?.["gem-orchestrator"])
    assert.equal(Object.hasOwn(hooks, "chat.params"), false)
  })

  it("marks orchestrator primary and all other generated agents as subagents", () => {
    const config: OpenCodeConfigWithAgents = {}

    injectGemTeamAgents(config)

    assert.equal(config.agent?.["gem-orchestrator"]?.mode, "primary")
    for (const slug of CANONICAL_GEM_TEAM_SLUGS.filter((slug) => slug !== "gem-orchestrator")) {
      assert.equal(config.agent?.[slug]?.mode, "subagent", `${slug} should be a subagent`)
    }
  })

  it("preserves existing agent model, prompt, mode, permission, and arbitrary user fields", () => {
    const config: OpenCodeConfigWithAgents = {
      agent: {
        "gem-reviewer": {
          model: "user-model",
          prompt: "user prompt",
          mode: "all",
          permission: { edit: "deny" },
          customField: "keep me",
        },
      },
    }

    injectGemTeamAgents(config)

    assert.deepEqual(config.agent?.["gem-reviewer"], {
      description: getGeneratedGemTeamAgents().find((agent) => agent.slug === "gem-reviewer")?.description,
      prompt: "user prompt",
      mode: "all",
      model: "user-model",
      permission: { edit: "deny" },
      customField: "keep me",
    })
  })

  it("injects delegation-first permission for gem-orchestrator only", () => {
    const config: OpenCodeConfigWithAgents = {}

    injectGemTeamAgents(config)

    assert.deepEqual(config.agent?.["gem-orchestrator"]?.permission, { edit: { "*": "deny", "docs/plan/*": "allow" }, bash: { "*": "deny", "git *": "allow", "rtk git *": "allow" }, read: { "*": "deny", "docs/plan/*": "allow", "**/.gem-team.yaml": "allow", "**/AGENTS.md": "allow" } })

    for (const slug of CANONICAL_GEM_TEAM_SLUGS.filter((slug) => slug !== "gem-orchestrator")) {
      assert.equal(
        Object.hasOwn(config.agent?.[slug] ?? {}, "permission"),
        false,
        `${slug} should not get a default permission`,
      )
    }
  })

  it("appends the delegation-first notice to gem-orchestrator prompt", () => {
    const config: OpenCodeConfigWithAgents = {}

    injectGemTeamAgents(config)

    const prompt = config.agent?.["gem-orchestrator"]?.prompt ?? ""

    assert.ok(prompt.includes("IMPORTANT NOTICE about your workflow"))
    assert.ok(prompt.includes("Before EVERY action"))
    assert.ok(prompt.includes("you MUST first output a decision block"))
    assert.ok(prompt.includes("Acting without a verbalized decision block is a workflow violation"))
    assert.ok(prompt.includes("When a tool call fails"))
    assert.ok(prompt.includes("analyze the error first"))
    assert.ok(prompt.includes("use relative paths, not absolute"))
    assert.ok(prompt.includes("permission_denied"))
    assert.ok(prompt.includes("At workflow checkpoints"))
    assert.ok(prompt.includes("After Phase 2"))
    assert.ok(prompt.includes("After Phase 3 wave completion"))
    assert.ok(prompt.includes(GEM_ORCHESTRATOR_PROMPT_NOTICE))
  })

  it("does not append the delegation-first notice to non-orchestrator prompts", () => {
    const config: OpenCodeConfigWithAgents = {}

    injectGemTeamAgents(config)

    for (const slug of CANONICAL_GEM_TEAM_SLUGS.filter((slug) => slug !== "gem-orchestrator")) {
      assert.equal(config.agent?.[slug]?.prompt?.includes("IMPORTANT NOTICE about your workflow"), false, `${slug} should not get the notice`)
    }
  })

  it("lets user-defined orchestrator permission keys win while keeping injected defaults for unset keys", () => {
    const config: OpenCodeConfigWithAgents = {
      agent: {
        "gem-orchestrator": {
          permission: { edit: "allow", bash: "allow" },
        },
      },
    }

    injectGemTeamAgents(config)

    // User-specified keys (edit/bash) win; injected defaults fill the remaining permission keys.
    assert.deepEqual(config.agent?.["gem-orchestrator"]?.permission, { edit: "allow", bash: "allow", read: { "*": "deny", "docs/plan/*": "allow", "**/.gem-team.yaml": "allow", "**/AGENTS.md": "allow" } })
  })

  it("keeps injected delegation-first defaults when the user only sets unrelated permission keys", () => {
    // Real-world regression: a user who only denies a few MCP tools on the orchestrator
    // must NOT silently lose the injected edit/bash/read delegation-first guards.
    const config: OpenCodeConfigWithAgents = {
      agent: {
        "gem-orchestrator": {
          model: "user-model",
          permission: {
            "intellij-debugger_*": "deny",
            "github_*": "deny",
          },
        },
      },
    }

    injectGemTeamAgents(config)

    assert.deepEqual(config.agent?.["gem-orchestrator"]?.permission, { edit: { "*": "deny", "docs/plan/*": "allow" }, bash: { "*": "deny", "git *": "allow", "rtk git *": "allow" }, read: { "*": "deny", "docs/plan/*": "allow", "**/.gem-team.yaml": "allow", "**/AGENTS.md": "allow" }, "intellij-debugger_*": "deny", "github_*": "deny" })
    assert.equal(config.agent?.["gem-orchestrator"]?.model, "user-model")
  })

  it("registers a tool.execute.before hook for the plugin server", async () => {
    const hooks = await plugin.server({ client: { session: { get: async () => ({ data: {}, error: undefined, request: {} as never, response: {} as never }) } }, directory: "." } as never)

    assert.equal(typeof hooks["tool.execute.before"], "function")
  })

  it("does not restrict non-orchestrator agents", async () => {
    const guard = createGemOrchestratorToolGuard(
      { session: { get: async () => ({ data: { agent: "gem-reviewer" }, error: undefined, request: {} as never, response: {} as never }) } } as never,
      ".",
    )

    await assert.doesNotReject(async () => {
      await guard({ tool: "grep", sessionID: "s1", callID: "c1" }, { args: { path: "src" } })
    })
  })

  it("allows gem-orchestrator grep/glob only under docs/plan", async () => {
    const guard = createGemOrchestratorToolGuard(
      { session: { get: async () => ({ data: { agent: "gem-orchestrator" }, error: undefined, request: {} as never, response: {} as never }) } } as never,
      ".",
    )

    for (const tool of ["grep", "glob"] as const) {
      await assert.doesNotReject(async () => {
        await guard({ tool, sessionID: "s1", callID: "c1" }, { args: { path: "docs/plan" } })
      })
      await assert.doesNotReject(async () => {
        await guard({ tool, sessionID: "s1", callID: "c1" }, { args: { path: "docs/plan/foo" } })
      })
      await assert.doesNotReject(async () => {
        await guard({ tool, sessionID: "s1", callID: "c1" }, { args: { path: "docs\\plan\\foo" } })
      })
    }
  })

  it("rejects gem-orchestrator grep/glob outside docs/plan or without path", async () => {
    const guard = createGemOrchestratorToolGuard(
      { session: { get: async () => ({ data: { agent: "gem-orchestrator" }, error: undefined, request: {} as never, response: {} as never }) } } as never,
      ".",
    )

    for (const tool of ["grep", "glob"] as const) {
      for (const args of [{ path: "." }, { path: "src" }, { path: "docs" }, { path: "docs/planner" }, { path: "mydocs/plan" }, {}]) {
        await assert.rejects(
          async () => {
            await guard({ tool, sessionID: "s1", callID: "c1" }, { args })
          },
          (error: unknown) => {
            assert.match(String(error), /gem-orchestrator path restriction/)
            assert.match(String(error), /docs\/plan\/\*\*/)
            assert.match(String(error), /subagent/)
            return true
          },
        )
      }
    }
  })

  it("does not create a model field for newly injected agents", () => {
    const config: OpenCodeConfigWithAgents = {}

    injectGemTeamAgents(config)

    for (const slug of CANONICAL_GEM_TEAM_SLUGS) {
      assert.equal(Object.hasOwn(config.agent?.[slug] ?? {}, "model"), false, `${slug} should not get a default model`)
    }
  })

  it("keeps gem-orchestrator excluded from its routing targets", () => {
    const targets = getGemOrchestratorRoutingTargets()

    assert.equal(targets.includes("gem-orchestrator"), false)
    assert.equal(targets.length, GEM_TEAM_AGENT_COUNT - 1)
  })

  it("loads non-empty prompts whose hashes match the manifest", () => {
    for (const agent of getGeneratedGemTeamAgents()) {
      assert.ok(agent.prompt.trim().length > 0, `${agent.slug} prompt should be non-empty`)
      assert.equal(createHash("sha256").update(agent.prompt).digest("hex"), agent.sourceBodySha256)
    }
  })
})
