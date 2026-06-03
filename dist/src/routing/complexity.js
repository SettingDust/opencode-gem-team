import { COMPLEXITY_TIERS } from "../constants.js";
const tierRank = {
    simple: 0,
    medium: 1,
    complex: 2,
};
const rankTier = ["simple", "medium", "complex"];
const reasoningCriticalRoles = new Set([
    "gem-planner",
    "gem-debugger",
    "gem-critic",
    "gem-reviewer",
]);
export function isComplexityTier(value) {
    return typeof value === "string" && COMPLEXITY_TIERS.includes(value);
}
export function normalizeComplexityTier(value) {
    if (isComplexityTier(value)) {
        return { tier: value, status: "valid", reason: "known_tier" };
    }
    if (value === undefined || value === null || value === "") {
        return { tier: "medium", status: "fallback", reason: "missing_tier_fallback_medium" };
    }
    return { tier: "medium", status: "fallback", reason: "unknown_tier_fallback_medium" };
}
export function classifyComplexityTier(input = {}) {
    let rank = tierRank.medium;
    const reasons = [];
    const signalTiers = [
        mapOrchestratorComplexity(input.orchestratorComplexity),
        mapPlannerComplexity(input.plannerComplexity),
        normalizeKnownTier(input.tierHint),
    ].filter((tier) => tier !== undefined);
    if (signalTiers.length > 0) {
        rank = Math.max(...signalTiers.map((tier) => tierRank[tier]));
        reasons.push("complexity_signal_highest_tier");
    }
    else {
        reasons.push("missing_complexity_signal_default_medium");
    }
    if (input.roleSlug !== undefined && reasoningCriticalRoles.has(input.roleSlug)) {
        if (rank < tierRank.medium)
            reasons.push("reasoning_critical_role_minimum_medium");
        else
            reasons.push("reasoning_critical_role_hint");
        rank = Math.max(rank, tierRank.medium);
    }
    const riskTier = riskUpgradeTier(input);
    if (riskTier !== undefined && tierRank[riskTier] > rank) {
        rank = tierRank[riskTier];
        reasons.push(`risk_upgrade_${riskTier}`);
    }
    return { tier: rankTier[rank], reasons };
}
function normalizeKnownTier(value) {
    return isComplexityTier(value) ? value : undefined;
}
function mapOrchestratorComplexity(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value.toLowerCase();
    if (normalized === "low")
        return "simple";
    if (normalized === "medium")
        return "medium";
    if (normalized === "high")
        return "complex";
    return undefined;
}
function mapPlannerComplexity(value) {
    return normalizeKnownTier(value);
}
function riskUpgradeTier(input) {
    const riskText = [input.riskLevel, input.riskScore, input.overallRiskLevel]
        .filter((value) => value !== undefined)
        .map(String)
        .join(" ")
        .toLowerCase();
    if (riskText.includes("critical") || riskText.includes("high"))
        return "complex";
    if (riskText.includes("medium") || riskText.includes("moderate"))
        return "medium";
    if (input.requiresDesignValidation === true
        || input.requiresApproval === true
        || input.securitySensitive === true
        || input.devopsSensitive === true
        || input.productionImpact === true
        || input.reviewDepth === "deep") {
        return "complex";
    }
    if (atLeast(input.estimatedEffort, 5)
        || atLeast(input.estimatedFiles, 8)
        || atLeast(input.estimatedLines, 400)) {
        return "medium";
    }
    return undefined;
}
function atLeast(value, threshold) {
    return typeof value === "number" && Number.isFinite(value) && value >= threshold;
}
//# sourceMappingURL=complexity.js.map