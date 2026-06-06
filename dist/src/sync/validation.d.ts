export declare const CANONICAL_GEM_TEAM_SLUGS: readonly ["gem-browser-tester", "gem-code-simplifier", "gem-critic", "gem-debugger", "gem-designer-mobile", "gem-designer", "gem-devops", "gem-documentation-writer", "gem-implementer-mobile", "gem-implementer", "gem-mobile-tester", "gem-orchestrator", "gem-planner", "gem-researcher", "gem-reviewer", "gem-skill-creator"];
export type GemTeamSlug = typeof CANONICAL_GEM_TEAM_SLUGS[number];
export type SyncedAgentManifestEntry = {
    slug: string;
    localSlug: string;
    name?: string;
    sourceUrl: string;
    rawUrl: string;
    upstreamRef: string;
    upstreamCommit: string;
    sourceBodySha256: string;
    bodyPath: string;
    bodyBytes: number;
    syncBatchId: string;
    syncedAt: string;
    prompt?: string;
    metadata?: {
        routingTargets?: string[];
        [key: string]: unknown;
    };
};
export type SyncedAgentsManifest = {
    schemaVersion: number;
    source: {
        owner: string;
        repo: string;
        path: string;
        ref: string;
        commit: string;
    };
    syncBatchId: string;
    syncedAt: string;
    expectedSlugs: readonly string[];
    agents: SyncedAgentManifestEntry[];
};
export type SyncValidationResult = {
    valid: true;
    errors: [];
} | {
    valid: false;
    errors: string[];
};
export declare function validateManifest(manifest: SyncedAgentsManifest): SyncValidationResult;
