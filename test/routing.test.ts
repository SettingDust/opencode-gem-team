import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  classifyComplexityTier,
  isComplexityTier,
  normalizeComplexityTier,
  resolveModel,
  validateGemTeamConfig,
} from "../src/index.js"

describe("complexity tier normalization", () => {
  it("supports only simple, medium, and complex", () => {
    assert.equal(isComplexityTier("simple"), true)
    assert.equal(isComplexityTier("medium"), true)
    assert.equal(isComplexityTier("complex"), true)
    assert.equal(isComplexityTier("extra"), false)
  })

  it("falls missing or unknown tier back to medium with a reason", () => {
    assert.deepEqual(normalizeComplexityTier(), {
      tier: "medium",
      status: "fallback",
      reason: "missing_tier_fallback_medium",
    })
    assert.deepEqual(normalizeComplexityTier("unknown"), {
      tier: "medium",
      status: "fallback",
      reason: "unknown_tier_fallback_medium",
    })
  })
})

describe("pure model resolver", () => {
  it("proves priority chain agent.model > complexity_models[tier] > selected model", () => {
    assert.deepEqual(resolveModel({
      requestedTier: "complex",
      agent: { model: "agent-model" },
      complexityModels: { complex: "tier-model" },
      currentSelectedModel: "selected-model",
    }), {
      tier: "complex",
      model: "agent-model",
      source: "native_agent_model",
      status: "resolved",
      reason: "native_agent_model_preserved",
    })

    assert.deepEqual(resolveModel({
      requestedTier: "medium",
      complexityModels: { medium: "tier-model" },
      currentSelectedModel: "selected-model",
    }), {
      tier: "medium",
      model: "tier-model",
      source: "complexity_model",
      status: "resolved",
      reason: "complexity_model_for_tier",
    })

    assert.deepEqual(resolveModel({
      requestedTier: "simple",
      complexityModels: {},
      currentSelectedModel: "selected-model",
    }), {
      tier: "simple",
      model: "selected-model",
      source: "current_selected_model",
      status: "resolved",
      reason: "complexity_model_missing_fallback_current_selected_model",
    })
  })

  it("covers all three configured tiers", () => {
    assert.equal(resolveModel({ requestedTier: "simple", complexityModels: { simple: "simple-model" } }).model, "simple-model")
    assert.equal(resolveModel({ requestedTier: "medium", complexityModels: { medium: "medium-model" } }).model, "medium-model")
    assert.equal(resolveModel({ requestedTier: "complex", complexityModels: { complex: "complex-model" } }).model, "complex-model")
  })

  it("returns no_model when no native, tier, or selected model exists", () => {
    assert.deepEqual(resolveModel({ requestedTier: "simple" }), {
      tier: "simple",
      source: "no_model",
      status: "no_model",
      reason: "no_agent_model_no_complexity_model_no_current_selected_model",
    })
  })

  it("does not mutate or overwrite the input agent config", () => {
    const agent = { model: "agent-model", description: "kept" }
    const before = structuredClone(agent)

    resolveModel({ requestedTier: "complex", agent, complexityModels: { complex: "tier-model" } })

    assert.deepEqual(agent, before)
  })

  it("uses normalized unknown tiers before resolving", () => {
    assert.deepEqual(resolveModel({
      requestedTier: "other",
      complexityModels: { medium: "tier-model" },
    }), {
      tier: "medium",
      model: "tier-model",
      source: "complexity_model",
      status: "resolved",
      reason: "unknown_tier_fallback_medium;complexity_model_for_tier",
    })
  })
})

describe("complexity classification", () => {
  it("maps orchestrator and planner signals to simple, medium, and complex", () => {
    assert.equal(classifyComplexityTier({ orchestratorComplexity: "LOW" }).tier, "simple")
    assert.equal(classifyComplexityTier({ plannerComplexity: "low" }).tier, "simple")
    assert.equal(classifyComplexityTier({ tierHint: "low" }).tier, "simple")
    assert.equal(classifyComplexityTier({ plannerComplexity: "medium" }).tier, "medium")
    assert.equal(classifyComplexityTier({ plannerComplexity: "high" }).tier, "complex")
    assert.equal(classifyComplexityTier({ orchestratorComplexity: "HIGH", plannerComplexity: "simple" }).tier, "complex")
  })

  it("uses risk signals only to upgrade, never downgrade", () => {
    assert.equal(classifyComplexityTier({ plannerComplexity: "simple", riskLevel: "high" }).tier, "complex")
    assert.equal(classifyComplexityTier({ plannerComplexity: "complex", riskLevel: "low" }).tier, "complex")
  })

  it("boosts critical roles from simple to medium without forcing complex", () => {
    const result = classifyComplexityTier({ roleSlug: "gem-planner", plannerComplexity: "simple" })

    assert.equal(result.tier, "medium")
    assert.equal(Object.hasOwn(result, "model"), false)
    assert.ok(result.reasons.includes("critical_role_boost_simple_to_medium"))

    const orchestrator = classifyComplexityTier({ roleSlug: "gem-orchestrator", plannerComplexity: "simple" })
    assert.equal(orchestrator.tier, "medium")
    assert.ok(orchestrator.reasons.includes("critical_role_boost_simple_to_medium"))

    const lowPlanner = classifyComplexityTier({ roleSlug: "gem-planner", plannerComplexity: "low" })
    assert.equal(lowPlanner.tier, "medium")
    assert.ok(lowPlanner.reasons.includes("critical_role_boost_simple_to_medium"))

    const lowTierHint = classifyComplexityTier({ roleSlug: "gem-planner", tierHint: "low" })
    assert.equal(lowTierHint.tier, "medium")
    assert.ok(lowTierHint.reasons.includes("critical_role_boost_simple_to_medium"))
  })

  it("keeps all five critical roles on the same medium escalation policy", () => {
    const criticalRoles = [
      "gem-orchestrator",
      "gem-planner",
      "gem-debugger",
      "gem-critic",
      "gem-reviewer",
    ]

    for (const roleSlug of criticalRoles) {
      const escalated = classifyComplexityTier({ roleSlug, plannerComplexity: "medium" })
      assert.equal(escalated.tier, "complex")
      assert.ok(escalated.reasons.includes("critical_role_escalate_medium_to_complex"))
    }
  })

  it("keeps complex critical roles at complex", () => {
    assert.equal(classifyComplexityTier({ roleSlug: "gem-reviewer", plannerComplexity: "complex" }).tier, "complex")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-reviewer", riskLevel: "high" }).tier, "complex")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-debugger", plannerComplexity: "medium" }).tier, "complex")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-orchestrator", orchestratorComplexity: "HIGH" }).tier, "complex")
  })

  it("escalates medium critical roles unconditionally", () => {
    const roles = ["gem-orchestrator", "gem-planner", "gem-debugger", "gem-critic", "gem-reviewer"]

    for (const roleSlug of roles) {
      const result = classifyComplexityTier({ roleSlug, plannerComplexity: "medium" })
      assert.equal(result.tier, "complex")
      assert.ok(result.reasons.includes("critical_role_escalate_medium_to_complex"))
    }
  })

  it("escalates medium critical roles even without extra signals", () => {
    const result = classifyComplexityTier({
      roleSlug: "gem-reviewer",
      plannerComplexity: "medium",
    })

    assert.equal(result.tier, "complex")
    assert.ok(result.reasons.includes("critical_role_escalate_medium_to_complex"))
  })

  it("does not drift non-critical role classification", () => {
    assert.equal(classifyComplexityTier({ roleSlug: "gem-implementer", plannerComplexity: "simple" }).tier, "simple")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-implementer", plannerComplexity: "low" }).tier, "simple")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-implementer", tierHint: "low" }).tier, "simple")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-implementer", plannerComplexity: "medium" }).tier, "medium")
    assert.equal(classifyComplexityTier({ roleSlug: "gem-implementer", plannerComplexity: "medium", estimatedEffort: 5 }).tier, "medium")
  })

  it("keeps complex critical roles as complex with hint reason", () => {
    const result = classifyComplexityTier({ roleSlug: "gem-reviewer", plannerComplexity: "complex" })

    assert.equal(result.tier, "complex")
    assert.ok(result.reasons.includes("critical_role_hint"))
    assert.ok(!result.reasons.includes("critical_role_escalate_medium_to_complex"))
  })
})

describe("configuration boundary", () => {
  it("rejects per-agent, role model, and provider-side model dimensions", () => {
    assert.deepEqual(validateGemTeamConfig({
      complexity_models: { simple: "simple-model" },
      role_models: {},
      agent_complexity_models: {},
      per_agent: {},
      provider_router: {},
      fallback_chain: [],
    }), {
      valid: false,
      errors: [
        "unsupported_config_key:role_models",
        "unsupported_config_key:agent_complexity_models",
        "unsupported_config_key:per_agent",
        "unsupported_config_key:provider_router",
        "unsupported_config_key:fallback_chain",
      ],
    })
  })
})
