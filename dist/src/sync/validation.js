export const CANONICAL_GEM_TEAM_SLUGS = [
    "gem-browser-tester",
    "gem-code-simplifier",
    "gem-critic",
    "gem-debugger",
    "gem-designer-mobile",
    "gem-designer",
    "gem-devops",
    "gem-documentation-writer",
    "gem-implementer-mobile",
    "gem-implementer",
    "gem-mobile-tester",
    "gem-orchestrator",
    "gem-planner",
    "gem-researcher",
    "gem-reviewer",
    "gem-skill-creator",
];
const FORBIDDEN_KEY_PATTERN = /\b(?:role_models|agent_complexity_models|provider_router|auto[_-]?model|fallback_chain|slash[_-]?commands?|telemetry|per[_-]?agent[_-]?models?)\b/i;
const FORBIDDEN_MODEL_ID_PATTERN = /\bmodel\b\s*[:=]\s*["'`](?!@)[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*["'`]/i;
const SECRET_PATTERN = /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret)\s*[:=]\s*['"`][^'"`]+['"`]/i;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
export function validateManifest(manifest) {
    const errors = [];
    const expected = [...CANONICAL_GEM_TEAM_SLUGS];
    const expectedSet = new Set(expected);
    const actual = manifest.agents.map((agent) => agent.slug);
    const actualSet = new Set(actual);
    if (manifest.schemaVersion !== 1)
        errors.push("manifest.schemaVersion must be 1");
    if (!isIsoDateTime(manifest.syncedAt))
        errors.push("manifest.syncedAt must be an ISO timestamp");
    if (!manifest.syncBatchId)
        errors.push("manifest.syncBatchId is required");
    if (manifest.source?.owner !== "mubaidr" || manifest.source?.repo !== "gem-team") {
        errors.push("manifest.source must point to mubaidr/gem-team");
    }
    if (manifest.source?.path !== ".apm/agents")
        errors.push("manifest.source.path must be .apm/agents");
    if (!manifest.source?.commit)
        errors.push("manifest.source.commit is required");
    const missing = expected.filter((slug) => !actualSet.has(slug));
    const extra = actual.filter((slug) => !expectedSet.has(slug));
    const duplicates = actual.filter((slug, index) => actual.indexOf(slug) !== index);
    if (missing.length > 0)
        errors.push(`missing slugs: ${missing.join(", ")}`);
    if (extra.length > 0)
        errors.push(`extra slugs: ${extra.join(", ")}`);
    if (duplicates.length > 0)
        errors.push(`duplicate slugs: ${[...new Set(duplicates)].join(", ")}`);
    const expectedSlugs = manifest.expectedSlugs ?? [];
    if (expectedSlugs.length !== expected.length || expected.some((slug, index) => expectedSlugs[index] !== slug)) {
        errors.push("manifest.expectedSlugs must equal canonical Gem Team slugs in canonical order");
    }
    for (const entry of manifest.agents) {
        validateEntry(entry, errors);
    }
    const orchestrator = manifest.agents.find((agent) => agent.slug === "gem-orchestrator");
    if (orchestrator?.metadata?.routingTargets?.includes("gem-orchestrator")) {
        errors.push("gem-orchestrator metadata.routingTargets must not include gem-orchestrator");
    }
    const serialized = JSON.stringify(manifest);
    if (FORBIDDEN_KEY_PATTERN.test(serialized))
        errors.push("manifest contains forbidden model/config dimension");
    if (FORBIDDEN_MODEL_ID_PATTERN.test(serialized))
        errors.push("manifest contains forbidden provider model ID");
    if (SECRET_PATTERN.test(serialized))
        errors.push("manifest contains secret-like assignment");
    return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}
function validateEntry(entry, errors) {
    if (entry.localSlug !== entry.slug)
        errors.push(`${entry.slug}: localSlug must match slug`);
    if (!entry.sourceUrl?.startsWith("https://github.com/mubaidr/gem-team/"))
        errors.push(`${entry.slug}: sourceUrl must point to GitHub upstream`);
    if (!entry.rawUrl?.startsWith("https://raw.githubusercontent.com/mubaidr/gem-team/"))
        errors.push(`${entry.slug}: rawUrl must point to read-only GitHub raw upstream`);
    if (!entry.upstreamCommit)
        errors.push(`${entry.slug}: upstreamCommit is required`);
    if (!SHA256_HEX_PATTERN.test(entry.sourceBodySha256 ?? ""))
        errors.push(`${entry.slug}: sourceBodySha256 must be sha256 hex`);
    if (!entry.bodyPath?.endsWith(`${entry.slug}.agent.md`))
        errors.push(`${entry.slug}: bodyPath must reference local agent body`);
    if (!Number.isInteger(entry.bodyBytes) || entry.bodyBytes <= 0)
        errors.push(`${entry.slug}: bodyBytes must be positive`);
    if (entry.syncBatchId === "")
        errors.push(`${entry.slug}: syncBatchId is required`);
    if (!isIsoDateTime(entry.syncedAt))
        errors.push(`${entry.slug}: syncedAt must be an ISO timestamp`);
    if (typeof entry.prompt === "string" && entry.prompt.trim().length === 0)
        errors.push(`${entry.slug}: prompt must be non-empty when present`);
}
function isIsoDateTime(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value)) && value.includes("T");
}
//# sourceMappingURL=validation.js.map