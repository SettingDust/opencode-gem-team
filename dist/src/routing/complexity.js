import { COMPLEXITY_TIERS } from "../constants.js";
const tierRank = {
    simple: 0,
    medium: 1,
    complex: 2,
};
const rankTier = ["simple", "medium", "complex"];
const criticalRoles = new Set([
    "gem-orchestrator",
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
        normalizeExternalComplexitySignal(input.orchestratorComplexity),
        normalizeExternalComplexitySignal(input.plannerComplexity),
        normalizeExternalComplexitySignal(input.tierHint),
    ].filter((tier) => tier !== undefined);
    if (signalTiers.length > 0) {
        rank = Math.max(...signalTiers.map((tier) => tierRank[tier]));
        reasons.push("complexity_signal_highest_tier");
    }
    else {
        reasons.push("missing_complexity_signal_default_medium");
    }
    if (input.roleSlug !== undefined && criticalRoles.has(input.roleSlug)) {
        if (rank === tierRank.simple) {
            rank = tierRank.medium;
            reasons.push("critical_role_boost_simple_to_medium");
        }
        else if (rank === tierRank.medium) {
            rank = tierRank.complex;
            reasons.push("critical_role_escalate_medium_to_complex");
        }
        else {
            reasons.push("critical_role_hint");
        }
    }
    const riskTier = riskUpgradeTier(input);
    if (riskTier !== undefined && tierRank[riskTier] > rank) {
        rank = tierRank[riskTier];
        reasons.push(`risk_upgrade_${riskTier}`);
    }
    return { tier: rankTier[rank], reasons };
}
function normalizeExternalComplexitySignal(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (isComplexityTier(normalized))
        return normalized;
    if (normalized === "low")
        return "simple";
    if (normalized === "medium")
        return "medium";
    if (normalized === "high")
        return "complex";
    return undefined;
}
function riskUpgradeTier(input) {
    const riskText = normalizedRiskText(input);
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
function normalizedRiskText(input) {
    return [input.riskLevel, input.riskScore, input.overallRiskLevel]
        .filter((value) => value !== undefined)
        .map(String)
        .join(" ")
        .toLowerCase();
}
function atLeast(value, threshold) {
    return typeof value === "number" && Number.isFinite(value) && value >= threshold;
}
//# sourceMappingURL=complexity.js.map