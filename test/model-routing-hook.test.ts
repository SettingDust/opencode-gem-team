import assert from "node:assert/strict"
import { describe, it } from "node:test"

import plugin, {
  createModelRoutingHooks,
  previewModelRouting,
  validateGemTeamConfig,
} from "../src/index.js"

describe("model routing dry-run preview", () => {
  it("resolves all three complexity model tiers with opaque model names", () => {
    assert.equal(previewModelRouting({
      signals: { tierHint: "simple" },
      complexityModels: { simple: "simple-tier-model" },
      currentSelectedModel: "selected-model",
    }).resolution.model, "simple-tier-model")

    assert.equal(previewModelRouting({
      signals: { tierHint: "medium" },
      complexityModels: { medium: "medium-tier-model" },
      currentSelectedModel: "selected-model",
    }).resolution.model, "medium-tier-model")

    assert.equal(previewModelRouting({
      signals: { tierHint: "complex" },
      complexityModels: { complex: "complex-tier-model" },
      currentSelectedModel: "selected-model",
    }).resolution.model, "complex-tier-model")
  })

  it("keeps native OpenCode agent.model above tier model", () => {
    const preview = previewModelRouting({
      signals: { tierHint: "complex" },
      agent: { model: "native-agent-model" },
      complexityModels: { complex: "complex-tier-model" },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.resolution.model, "native-agent-model")
    assert.equal(preview.resolution.source, "native_agent_model")
    assert.equal(preview.hookMutation.wouldMutateOutputOptions, false)
    assert.equal(preview.hookMutation.reason, "native_agent_model_preserved_no_hook_model_override")
  })

  it("falls back to current selected model when tier model is absent", () => {
    const preview = previewModelRouting({
      signals: { tierHint: "simple" },
      complexityModels: {},
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.resolution.model, "selected-model")
    assert.equal(preview.resolution.source, "current_selected_model")
  })

  it("uses reasoning-critical and risk signals to upgrade tier without role model mapping", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-reviewer",
        plannerComplexity: "simple",
        requiresApproval: true,
      },
      complexityModels: { complex: "complex-tier-model" },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "complex")
    assert.equal(preview.resolution.model, "complex-tier-model")
    assert.equal(Object.hasOwn(preview, "roleModels"), false)
  })

  it("rejects forbidden model routing config dimensions", () => {
    assert.deepEqual(validateGemTeamConfig({
      complexity_models: {
        simple: "simple-tier-model",
        experimental: "not-allowed",
      },
      role_models: {},
      agent_complexity_models: {},
      providerRouter: {},
      virtualModels: {},
    }), {
      valid: false,
      errors: [
        "unsupported_config_key:role_models",
        "unsupported_config_key:agent_complexity_models",
        "unsupported_config_key:providerRouter",
        "unsupported_config_key:virtualModels",
        "unsupported_complexity_tier:experimental",
      ],
    })
  })
})

describe("chat.params hook dry-run integration", () => {
  it("exposes chat.params and mutates only output.options in mock invocation", async () => {
    const config = {
      agent: {
        "gem-implementer": { description: "kept" },
      },
    }
    const hooks = createModelRoutingHooks({ complexity_models: { medium: "medium-tier-model" } }, () => config)
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: { existing: "kept" } as Record<string, unknown>,
    }

    await hooks["chat.params"]?.({
      sessionID: "session-one",
      agent: "gem-implementer",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-implementer", "selected-model"),
    }, output)

    assert.deepEqual(output, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {
        existing: "kept",
        model: "medium-tier-model",
        gemTeamModelRouting: {
          status: "dry_run_output_options_only",
          tier: "medium",
          source: "complexity_model",
          reason: "complexity_model_for_tier",
        },
      },
    })
  })

  it("does not call providers, read env, or write global config during mock hook invocation", async () => {
    const originalEnv = process.env
    const hooks = createModelRoutingHooks({ complexity_models: { simple: "simple-tier-model" } }, () => ({ agent: {} }))
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {} as Record<string, unknown>,
    }
    let providerTouched = false
    const provider = new Proxy(mockProvider(), {
      get(target, prop, receiver) {
        if (prop !== "source" && prop !== "info" && prop !== "options") providerTouched = true
        return Reflect.get(target, prop, receiver)
      },
    })

    await hooks["chat.params"]?.({
      sessionID: "session-one",
      agent: "gem-implementer",
      model: mockModel("selected-model"),
      provider,
      message: mockMessage("gem-implementer", "selected-model", { tierHint: "simple" }),
    }, output)

    assert.equal(process.env, originalEnv)
    assert.equal(providerTouched, false)
    assert.equal(output.options.model, "simple-tier-model")
  })

  it("keeps native agent model by not writing output.options.model", async () => {
    const hooks = createModelRoutingHooks({ complexity_models: { complex: "complex-tier-model" } }, () => ({
      agent: {
        "gem-reviewer": { model: "native-agent-model" },
      },
    }))
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {} as Record<string, unknown>,
    }

    await hooks["chat.params"]?.({
      sessionID: "session-one",
      agent: "gem-reviewer",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-reviewer", "selected-model", { tierHint: "complex" }),
    }, output)

    assert.equal(Object.hasOwn(output.options, "model"), false)
    assert.deepEqual(output.options.gemTeamModelRouting, {
      status: "native_agent_model_preserved_no_hook_model_override",
      tier: "complex",
      source: "native_agent_model",
      reason: "native_agent_model_preserved",
    })
  })

  it("plugin server wires config and chat.params hooks without provider calls", async () => {
    const hooks = await plugin.server({} as never, { complexity_models: { medium: "medium-tier-model" } })
    assert.equal(typeof hooks.config, "function")
    assert.equal(typeof hooks["chat.params"], "function")
  })
})

function mockModel(id: string) {
  return {
    id,
    providerID: "opaque-provider",
    api: { id: "opaque-api", url: "", npm: "" },
    name: id,
    capabilities: {
      temperature: true,
      reasoning: false,
      attachment: false,
      toolcall: false,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
    },
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 0, output: 0 },
    status: "active",
    options: {},
    headers: {},
  } as never
}

function mockProvider() {
  return {
    source: "custom",
    info: {
      id: "opaque-provider",
      name: "opaque-provider",
      source: "custom",
      env: [],
      options: {},
      models: {},
    },
    options: {},
  } as never
}

function mockMessage(agent: string, modelID: string, routing?: Record<string, unknown>) {
  return {
    id: "message-one",
    sessionID: "session-one",
    role: "user",
    time: { created: 0 },
    agent,
    model: { providerID: "opaque-provider", modelID },
    gemTeam: routing,
  } as never
}
