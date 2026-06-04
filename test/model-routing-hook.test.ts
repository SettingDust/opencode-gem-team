import assert from "node:assert/strict"
import { describe, it } from "node:test"

import plugin, {
  applyChatParamsModelRouting,
  createModelRoutingHooks,
  createRoutingSessionNotifier,
  isCanonicalGemTeamAgent,
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

  it("uses critical role and risk signals to upgrade tier without role model mapping", () => {
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

  it("keeps the five critical roles on the same boost/escalation ladder", () => {
    const criticalRoles = ["gem-orchestrator", "gem-planner", "gem-debugger", "gem-critic", "gem-reviewer"]

    for (const roleSlug of criticalRoles) {
      const boostPreview = previewModelRouting({
        signals: { roleSlug, plannerComplexity: "simple" },
        complexityModels: {
          medium: "medium-tier-model",
          complex: "complex-tier-model",
        },
        currentSelectedModel: "selected-model",
      })

      const hintPreview = previewModelRouting({
        signals: { roleSlug, plannerComplexity: "medium" },
        complexityModels: {
          medium: "medium-tier-model",
          complex: "complex-tier-model",
        },
        currentSelectedModel: "selected-model",
      })

      const escalatePreview = previewModelRouting({
        signals: {
          roleSlug,
          plannerComplexity: "medium",
          productionImpact: true,
        },
        complexityModels: {
          medium: "medium-tier-model",
          complex: "complex-tier-model",
        },
        currentSelectedModel: "selected-model",
      })

      assert.equal(boostPreview.classification.tier, "medium")
      assert.ok(boostPreview.classification.reasons.includes("critical_role_boost_simple_to_medium"))
      assert.equal(hintPreview.classification.tier, "complex")
      assert.ok(hintPreview.classification.reasons.includes("critical_role_escalate_medium_to_complex"))
      assert.equal(escalatePreview.classification.tier, "complex")
      assert.ok(escalatePreview.classification.reasons.includes("critical_role_escalate_medium_to_complex"))
    }
  })

  it("normalizes low external signals before critical-role escalation", () => {
    const plannerComplexityPreview = previewModelRouting({
      signals: { roleSlug: "gem-planner", plannerComplexity: "low" },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    const tierHintPreview = previewModelRouting({
      signals: { roleSlug: "gem-planner", tierHint: "low" },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(plannerComplexityPreview.classification.tier, "medium")
    assert.equal(plannerComplexityPreview.resolution.model, "medium-tier-model")
    assert.ok(plannerComplexityPreview.classification.reasons.includes("critical_role_boost_simple_to_medium"))
    assert.ok(!plannerComplexityPreview.classification.reasons.includes("critical_role_escalate_medium_to_complex"))
    assert.equal(tierHintPreview.classification.tier, "medium")
    assert.equal(tierHintPreview.resolution.model, "medium-tier-model")
    assert.ok(tierHintPreview.classification.reasons.includes("critical_role_boost_simple_to_medium"))
    assert.ok(!tierHintPreview.classification.reasons.includes("critical_role_escalate_medium_to_complex"))
  })

  it("keeps medium and high external planner signals on the critical-role ladder", () => {
    const mediumPreview = previewModelRouting({
      signals: { roleSlug: "gem-planner", plannerComplexity: "medium" },
      complexityModels: { complex: "complex-tier-model" },
      currentSelectedModel: "selected-model",
    })

    const highPreview = previewModelRouting({
      signals: { roleSlug: "gem-planner", plannerComplexity: "high" },
      complexityModels: { complex: "complex-tier-model" },
      currentSelectedModel: "selected-model",
    })

    assert.equal(mediumPreview.classification.tier, "complex")
    assert.equal(mediumPreview.resolution.model, "complex-tier-model")
    assert.ok(mediumPreview.classification.reasons.includes("critical_role_escalate_medium_to_complex"))
    assert.equal(highPreview.classification.tier, "complex")
    assert.equal(highPreview.resolution.model, "complex-tier-model")
    assert.ok(highPreview.classification.reasons.includes("critical_role_hint"))
  })

  it("keeps simple critical roles on medium even when risk upgrades the final tier", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-debugger",
        plannerComplexity: "simple",
        productionImpact: true,
      },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "complex")
    assert.ok(preview.classification.reasons.includes("critical_role_boost_simple_to_medium"))
    assert.ok(preview.classification.reasons.includes("risk_upgrade_complex"))
    assert.equal(preview.resolution.model, "complex-tier-model")
  })

  it("boosts gem-orchestrator to medium on simple work without forcing complex", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-orchestrator",
        plannerComplexity: "simple",
      },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "medium")
    assert.equal(preview.resolution.source, "complexity_model")
    assert.equal(preview.resolution.model, "medium-tier-model")
    assert.ok(preview.classification.reasons.includes("critical_role_boost_simple_to_medium"))
  })

  it("keeps critical roles on complex once direct complexity reaches complex", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-orchestrator",
        plannerComplexity: "complex",
      },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "complex")
    assert.equal(preview.resolution.model, "complex-tier-model")
    assert.ok(preview.classification.reasons.includes("critical_role_hint"))
  })

  it("escalates medium critical roles without extra signals", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-reviewer",
        plannerComplexity: "medium",
      },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "complex")
    assert.equal(preview.resolution.model, "complex-tier-model")
    assert.ok(preview.classification.reasons.includes("critical_role_escalate_medium_to_complex"))
  })

  it("does not drift non-critical medium roles upward", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-implementer",
        plannerComplexity: "medium",
      },
      complexityModels: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "medium")
    assert.equal(preview.resolution.model, "medium-tier-model")
    assert.deepEqual(preview.classification.reasons, ["complexity_signal_highest_tier"])
  })

  it("does not drift non-critical low aliases upward", () => {
    const preview = previewModelRouting({
      signals: {
        roleSlug: "gem-implementer",
        plannerComplexity: "low",
      },
      complexityModels: {
        simple: "simple-tier-model",
        medium: "medium-tier-model",
      },
      currentSelectedModel: "selected-model",
    })

    assert.equal(preview.classification.tier, "simple")
    assert.equal(preview.resolution.model, "simple-tier-model")
    assert.deepEqual(preview.classification.reasons, ["complexity_signal_highest_tier"])
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
  it("recognizes only canonical gem agents as routable", () => {
    assert.equal(isCanonicalGemTeamAgent("gem-reviewer"), true)
    assert.equal(isCanonicalGemTeamAgent("assistant"), false)
    assert.equal(isCanonicalGemTeamAgent("custom-gem-reviewer"), false)
  })

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

  it("normalizes hook message routing.tier low for critical roles", async () => {
    const hooks = createModelRoutingHooks({
      complexity_models: {
        medium: "medium-tier-model",
        complex: "complex-tier-model",
      },
    }, () => ({ agent: {} }))
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {} as Record<string, unknown>,
    }

    await hooks["chat.params"]?.({
      sessionID: "session-routing-tier-low",
      agent: "gem-planner",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: {
        ...(mockMessage("gem-planner", "selected-model") as Record<string, unknown>),
        gemTeam: undefined,
        routing: { tier: "low" },
      } as never,
    }, output)

    assert.equal(output.options.model, "medium-tier-model")
    assert.deepEqual(output.options.gemTeamModelRouting, {
      status: "dry_run_output_options_only",
      tier: "medium",
      source: "complexity_model",
      reason: "complexity_model_for_tier",
    })
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

  it("skips non-gem agents entirely without mutating output or notifying", async () => {
    const prompts: Array<Record<string, unknown>> = []
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: { existing: "kept" } as Record<string, unknown>,
    }

    const result = await applyChatParamsModelRouting({
      sessionID: "session-non-gem",
      agent: "assistant",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("assistant", "selected-model", { tierHint: "complex" }, "info"),
    }, output, {
      complexity_models: { complex: "complex-tier-model" },
    }, {
      agent: {
        assistant: { model: "native-existing-model" },
      },
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    assert.equal(result, undefined)
    assert.deepEqual(output.options, { existing: "kept" })
    assert.equal(prompts.length, 0)
  })

  it("does not mutate selected or existing model for non-gem agents", async () => {
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: { model: "existing-selected-model" } as Record<string, unknown>,
    }

    await applyChatParamsModelRouting({
      sessionID: "session-non-gem-2",
      agent: "custom-agent",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("custom-agent", "selected-model", { tierHint: "simple" }, "info"),
    }, output, {
      complexity_models: { simple: "simple-tier-model" },
    }, {
      agent: {
        "custom-agent": { model: "native-existing-model" },
      },
    })

    assert.deepEqual(output.options, { model: "existing-selected-model" })
  })

  it("plugin server wires config and chat.params hooks without provider calls", async () => {
    const hooks = await plugin.server({ client: { session: { prompt: async () => ({}) } } } as never, { complexity_models: { medium: "medium-tier-model" } })
    assert.equal(typeof hooks.config, "function")
    assert.equal(typeof hooks["chat.params"], "function")
  })

  it("uses an ignored no-reply session prompt with compact English decision notice text", async () => {
    const prompts: Array<Record<string, unknown>> = []
    let toastCalled = false
    let chatMessageCalled = false

    await applyChatParamsModelRouting({
      sessionID: "session-one",
      agent: "gem-implementer",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-implementer", "selected-model", { tierHint: "medium" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: { medium: "medium-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
      tui: {
        showToast: async () => {
          toastCalled = true
        },
      },
      chat: {
        message: async () => {
          chatMessageCalled = true
        },
      },
    } as never))

    const expectedText = [
      "Model routing",
      "Agent: Implementer (gem-implementer)",
      "Tier: medium (complexity signal)",
      "Source: plugin complexity_models.medium",
      "Model: medium-tier-model",
      "Reasons: complexity",
    ].join("\n")

    assert.deepEqual(prompts, [{
      path: { id: "session-one" },
      query: { directory: process.cwd() },
      body: {
        noReply: true,
        parts: [{ type: "text", text: expectedText, ignored: true }],
      },
    }])
    assert.match(expectedText, /^Model routing\nAgent: Implementer \(gem-implementer\)\nTier: medium \(complexity signal\)\nSource: plugin complexity_models\.medium\nModel: medium-tier-model\nReasons: complexity$/)
    assert.doesNotMatch(expectedText, /[^\x00-\x7F]/)
    assert.equal((prompts[0] as { body: { noReply: boolean } }).body.noReply, true)
    assert.equal((prompts[0] as { body: { parts: Array<{ ignored: boolean }> } }).body.parts[0]?.ignored, true)
    assert.equal(toastCalled, false)
    assert.equal(chatMessageCalled, false)
  })

  it("does not call toast or chat.message when session prompt succeeds", async () => {
    const prompts: Array<Record<string, unknown>> = []
    let toastCalled = false
    let chatMessageCalled = false
    const notify = createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
      tui: {
        showToast: async () => {
          toastCalled = true
        },
      },
      chat: {
        message: async () => {
          chatMessageCalled = true
        },
      },
    } as never)

    await notify({
      sessionID: "session-one",
      agent: "gem-implementer",
      tier: "medium",
      source: "complexity_model",
      model: "medium-tier-model",
    })

    assert.deepEqual(prompts, [{
      path: { id: "session-one" },
      query: { directory: process.cwd() },
      body: {
        noReply: true,
        parts: [{ type: "text", text: [
          "Model routing",
          "Agent: Implementer (gem-implementer)",
          "Tier: medium (resolved)",
          "Source: plugin complexity_models.medium",
          "Model: medium-tier-model",
          "Reasons: plugin tier model",
        ].join("\n"), ignored: true }],
      },
    }])
    assert.equal(toastCalled, false)
    assert.equal(chatMessageCalled, false)
  })

  it("deduplicates repeated ignored no-reply session prompts for the same session result", async () => {
    const prompts: Array<Record<string, unknown>> = []
    const notify = createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never)

    await notify({
      sessionID: "session-one",
      agent: "gem-reviewer",
      tier: "complex",
      source: "native_agent_model",
      model: "review-model",
    })
    await notify({
      sessionID: "session-one",
      agent: "gem-reviewer",
      tier: "complex",
      source: "native_agent_model",
      model: "review-model",
    })

    assert.equal(prompts.length, 1)
    assert.equal((prompts[0] as { body?: { parts?: Array<{ text?: string }> } })?.body?.parts?.[0]?.text, [
      "Model routing",
      "Agent: Reviewer (gem-reviewer)",
      "Tier: complex (resolved)",
      "Source: agent model",
      "Model: review-model",
      "Reasons: agent model",
    ].join("\n"))
  })

  it("silently skips the notice when session prompt transport is unavailable", async () => {
    const notify = createRoutingSessionNotifier({
      tui: {
        showToast: async () => {
          throw new Error("toast should not be used")
        },
      },
      chat: {
        message: async () => {
          throw new Error("chat.message should not be used")
        },
      },
    } as never)

    await notify({
      sessionID: "session-two",
      agent: "gem-critic",
      tier: "simple",
      source: "current_selected_model",
      model: "selected-model",
    })
  })

  it("sends only the ACP-like ignored no-reply payload shape", async () => {
    const prompts: Array<Record<string, unknown>> = []
    const notify = createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never)

    await notify({
      sessionID: "session-two",
      agent: "gem-critic",
      tier: "simple",
      source: "current_selected_model",
      model: "selected-model",
    })

    assert.deepEqual(prompts, [{
      path: { id: "session-two" },
      query: { directory: process.cwd() },
      body: {
        noReply: true,
        parts: [{ type: "text", text: [
          "Model routing",
          "Agent: Critic (gem-critic)",
          "Tier: simple (resolved)",
          "Source: current selected model",
          "Model: selected-model",
          "Reasons: current model",
        ].join("\n"), ignored: true }],
      },
    }])
    assert.equal(Object.hasOwn(prompts[0] as object, "url"), false)
    assert.equal(Object.hasOwn((prompts[0] as { body: object }).body, "variant"), false)
  })

  it("uses session prompt even when selected model metadata is available", async () => {
    const prompts: Array<Record<string, unknown>> = []

    await applyChatParamsModelRouting({
      sessionID: "session-three",
      agent: "gem-critic",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-critic", "selected-model", { tierHint: "simple" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: {},
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    assert.deepEqual(prompts, [{
      path: { id: "session-three" },
      query: { directory: process.cwd() },
      body: {
        noReply: true,
        parts: [{ type: "text", text: [
          "Model routing",
          "Agent: Critic (gem-critic)",
          "Tier: medium (critical role boost)",
          "Source: current selected model",
          "Model: selected-model",
          "Reasons: critical role boost; complexity; fallback",
        ].join("\n"), ignored: true }],
      },
    }])
    assert.equal(Object.hasOwn(prompts[0] as object, "model"), false)
  })

  it("labels critical-role escalation notices for medium inputs without claiming a boost", async () => {
    const prompts: Array<Record<string, unknown>> = []

    await applyChatParamsModelRouting({
      sessionID: "session-hint",
      agent: "gem-reviewer",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-reviewer", "selected-model", { plannerComplexity: "medium" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: { complex: "complex-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    const text = (prompts[0] as { body: { parts: Array<{ text: string; ignored: boolean }> } }).body.parts[0].text
    assert.equal(text, [
      "Model routing",
      "Agent: Reviewer (gem-reviewer)",
      "Tier: complex (critical role escalation)",
      "Source: plugin complexity_models.complex",
      "Model: complex-tier-model",
      "Reasons: critical role escalation; complexity",
    ].join("\n"))
    assert.doesNotMatch(text, /critical role boost/)
    assert.equal((prompts[0] as { body: { noReply: boolean; parts: Array<{ ignored: boolean }> } }).body.noReply, true)
    assert.equal((prompts[0] as { body: { parts: Array<{ ignored: boolean }> } }).body.parts[0].ignored, true)
    assert.doesNotMatch(text, /[^\x00-\x7F]/)
  })

  it("labels critical-role medium escalation notices without claiming boost", async () => {
    const prompts: Array<Record<string, unknown>> = []

    await applyChatParamsModelRouting({
      sessionID: "session-critical-escalate",
      agent: "gem-debugger",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-debugger", "selected-model", { plannerComplexity: "medium", reviewDepth: "normal" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: { complex: "complex-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    const text = (prompts[0] as { body: { parts: Array<{ text: string; ignored: boolean }> } }).body.parts[0].text
    assert.equal(text, [
      "Model routing",
      "Agent: Debugger (gem-debugger)",
      "Tier: complex (critical role escalation)",
      "Source: plugin complexity_models.complex",
      "Model: complex-tier-model",
      "Reasons: critical role escalation; complexity",
    ].join("\n"))
    assert.doesNotMatch(text, /critical role complex/)
    assert.equal((prompts[0] as { body: { noReply: boolean; parts: Array<{ ignored: boolean }> } }).body.noReply, true)
    assert.equal((prompts[0] as { body: { parts: Array<{ ignored: boolean }> } }).body.parts[0].ignored, true)
  })

  it("uses the same escalation notice for planner and reviewer on the same input", async () => {
    const prompts: Array<Record<string, unknown>> = []
    const notify = createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never)

    for (const agent of ["gem-planner", "gem-reviewer"]) {
      await applyChatParamsModelRouting({
        sessionID: `session-${agent}`,
        agent,
        model: mockModel("selected-model"),
        provider: mockProvider(),
        message: mockMessage(agent, "selected-model", { plannerComplexity: "medium", reviewDepth: "normal" }, "info"),
      }, {
        temperature: 0,
        topP: 0,
        topK: 0,
        maxOutputTokens: undefined,
        options: {},
      }, {
        complexity_models: { complex: "complex-tier-model" },
      }, {
        agent: {},
      }, notify)
    }

    const texts = prompts.map((prompt) => (prompt as { body: { parts: Array<{ text: string }> } }).body.parts[0].text)
    assert.match(texts[0]!, /Tier: complex \(critical role escalation\)/)
    assert.match(texts[1]!, /Tier: complex \(critical role escalation\)/)
    assert.match(texts[0]!, /Reasons: critical role escalation; complexity/)
    assert.match(texts[1]!, /Reasons: critical role escalation; complexity/)
  })

  it("labels orchestrator escalation notices with the shared critical-role wording", async () => {
    const prompts: Array<Record<string, unknown>> = []

    await applyChatParamsModelRouting({
      sessionID: "session-escalate",
      agent: "gem-orchestrator",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-orchestrator", "selected-model", { plannerComplexity: "medium", reviewDepth: "normal" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: { medium: "medium-tier-model", complex: "complex-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    const text = (prompts[0] as { body: { parts: Array<{ text: string; ignored: boolean }> } }).body.parts[0].text
    assert.equal(text, [
      "Model routing",
      "Agent: Orchestrator (gem-orchestrator)",
      "Tier: complex (critical role escalation)",
      "Source: plugin complexity_models.complex",
      "Model: complex-tier-model",
      "Reasons: critical role escalation; complexity",
    ].join("\n"))
    assert.doesNotMatch(text, /critical role complex\)$/)
    assert.equal((prompts[0] as { body: { noReply: boolean; parts: Array<{ ignored: boolean }> } }).body.noReply, true)
    assert.equal((prompts[0] as { body: { parts: Array<{ ignored: boolean }> } }).body.parts[0].ignored, true)
    assert.doesNotMatch(text, /[^\x00-\x7F]/)
  })

  it("labels direct simple-to-medium boost with the shared critical-role wording", async () => {
    const prompts: Array<Record<string, unknown>> = []

    await applyChatParamsModelRouting({
      sessionID: "session-simple-escalate",
      agent: "gem-debugger",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-debugger", "selected-model", { plannerComplexity: "simple" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: { medium: "medium-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    const text = (prompts[0] as { body: { parts: Array<{ text: string; ignored: boolean }> } }).body.parts[0].text
    assert.equal(text, [
      "Model routing",
      "Agent: Debugger (gem-debugger)",
      "Tier: medium (critical role boost)",
      "Source: plugin complexity_models.medium",
      "Model: medium-tier-model",
      "Reasons: critical role boost; complexity",
    ].join("\n"))
  })

  it("keeps routing output unchanged while using ignored no-reply session prompt notice", async () => {
    const prompts: Array<Record<string, unknown>> = []
    const output = {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {} as Record<string, unknown>,
    }

    const preview = await applyChatParamsModelRouting({
      sessionID: "session-four",
      agent: "gem-reviewer",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-reviewer", "selected-model", { tierHint: "complex" }, "info"),
    }, output, {
      complexity_models: { complex: "complex-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    assert.ok(preview)
    assert.deepEqual(prompts, [{
      path: { id: "session-four" },
      query: { directory: process.cwd() },
      body: {
        noReply: true,
        parts: [{ type: "text", text: [
          "Model routing",
          "Agent: Reviewer (gem-reviewer)",
          "Tier: complex (critical role complex)",
          "Source: plugin complexity_models.complex",
          "Model: complex-tier-model",
          "Reasons: critical role complex; complexity",
        ].join("\n"), ignored: true }],
      },
    }])
    assert.equal(preview.resolution.model, "complex-tier-model")
    assert.equal(preview.resolution.source, "complexity_model")
    assert.equal(output.options.model, "complex-tier-model")
    assert.deepEqual(output.options.gemTeamModelRouting, {
      status: "dry_run_output_options_only",
      tier: "complex",
      source: "complexity_model",
      reason: "complexity_model_for_tier",
    })
  })

  it("renders orchestration-focused ignored no-reply session prompts in English", async () => {
    const prompts: Array<Record<string, unknown>> = []

    await applyChatParamsModelRouting({
      sessionID: "session-five",
      agent: "gem-orchestrator",
      model: mockModel("selected-model"),
      provider: mockProvider(),
      message: mockMessage("gem-orchestrator", "selected-model", { plannerComplexity: "simple" }, "info"),
    }, {
      temperature: 0,
      topP: 0,
      topK: 0,
      maxOutputTokens: undefined,
      options: {},
    }, {
      complexity_models: { complex: "complex-tier-model" },
    }, {
      agent: {},
    }, createRoutingSessionNotifier({
      session: {
        prompt: async (prompt: Record<string, unknown>) => {
          prompts.push(prompt)
        },
      },
    } as never))

    assert.deepEqual(prompts, [{
      path: { id: "session-five" },
      query: { directory: process.cwd() },
      body: {
        noReply: true,
        parts: [{ type: "text", text: [
          "Model routing",
          "Agent: Orchestrator (gem-orchestrator)",
          "Tier: medium (critical role boost)",
          "Source: current selected model",
          "Model: selected-model",
          "Reasons: critical role boost; complexity; fallback",
        ].join("\n"), ignored: true }],
      },
    }])
    assert.doesNotMatch((prompts[0] as { body: { parts: Array<{ text: string }> } }).body.parts[0].text, /[^\x00-\x7F]/)
  })

  it("silently skips when session prompt throws and does not fall back", async () => {
    let toastCalled = false
    let chatMessageCalled = false
    const notify = createRoutingSessionNotifier({
      session: {
        prompt: async () => {
          throw new Error("prompt failed")
        },
      },
      tui: {
        showToast: async () => {
          toastCalled = true
        },
      },
      chat: {
        message: async () => {
          chatMessageCalled = true
        },
      },
    } as never)

    await notify({
      sessionID: "session-six",
      agent: "gem-implementer",
      tier: "medium",
      source: "complexity_model",
      model: "medium-tier-model",
    })

    assert.equal(toastCalled, false)
    assert.equal(chatMessageCalled, false)
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

function mockMessage(agent: string, modelID: string, routing?: Record<string, unknown>, variant?: string) {
  return {
    id: "message-one",
    sessionID: "session-one",
    role: "user",
    time: { created: 0 },
    variant,
    agent,
    model: { providerID: "opaque-provider", modelID },
    gemTeam: routing,
  } as never
}
