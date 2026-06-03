import { normalizeComplexityTier } from "./complexity.js";
const unsupportedConfigKeys = new Set([
    "role_models",
    "agent_complexity_models",
    "per_agent",
    "perAgent",
    "provider_router",
    "providerRouter",
    "fallback_chain",
    "fallbackChain",
    "virtual_models",
    "virtualModels",
]);
export function resolveModel(input) {
    const normalized = normalizeComplexityTier(input.requestedTier);
    const reasonPrefix = normalized.status === "fallback" ? `${normalized.reason};` : "";
    const tier = normalized.tier;
    const nativeAgentModel = nonEmptyString(input.agent?.model);
    if (nativeAgentModel !== undefined) {
        return {
            tier,
            model: nativeAgentModel,
            source: "native_agent_model",
            status: "resolved",
            reason: `${reasonPrefix}native_agent_model_preserved`,
        };
    }
    const complexityModel = modelForTier(input.complexityModels, tier);
    if (complexityModel !== undefined) {
        return {
            tier,
            model: complexityModel,
            source: "complexity_model",
            status: "resolved",
            reason: `${reasonPrefix}complexity_model_for_tier`,
        };
    }
    const selectedModel = nonEmptyString(input.currentSelectedModel);
    if (selectedModel !== undefined) {
        return {
            tier,
            model: selectedModel,
            source: "current_selected_model",
            status: "resolved",
            reason: `${reasonPrefix}complexity_model_missing_fallback_current_selected_model`,
        };
    }
    return {
        tier,
        source: "no_model",
        status: "no_model",
        reason: `${reasonPrefix}no_agent_model_no_complexity_model_no_current_selected_model`,
    };
}
export function validateGemTeamConfig(config) {
    const errors = [];
    for (const key of Object.keys(config)) {
        if (unsupportedConfigKeys.has(key))
            errors.push(`unsupported_config_key:${key}`);
    }
    const complexityModels = config.complexity_models;
    if (complexityModels !== undefined) {
        for (const key of Object.keys(complexityModels)) {
            if (key !== "simple" && key !== "medium" && key !== "complex") {
                errors.push(`unsupported_complexity_tier:${key}`);
            }
        }
    }
    return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
function modelForTier(models, tier) {
    if (models === undefined)
        return undefined;
    return nonEmptyString(models[tier]);
}
function nonEmptyString(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? value : undefined;
}
//# sourceMappingURL=resolve-model.js.map