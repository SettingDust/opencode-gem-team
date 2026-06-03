import { type GemTeamSlug, type SyncedAgentManifestEntry } from "../sync/validation.js";
export type GeneratedGemTeamAgent = {
    slug: GemTeamSlug;
    name: string;
    description: string;
    mode: "primary" | "subagent";
    prompt: string;
    sourceBodySha256: string;
    manifestEntry: SyncedAgentManifestEntry;
    routingTargets: readonly GemTeamSlug[];
};
export declare function getGeneratedGemTeamAgents(): readonly GeneratedGemTeamAgent[];
export declare function getGemOrchestratorRoutingTargets(): readonly GemTeamSlug[];
