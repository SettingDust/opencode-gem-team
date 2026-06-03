import type { GemTeamConfigValidationResult, GemTeamPluginOptions, ResolveModelInput, ResolveModelResult } from "../types.js";
export declare function resolveModel(input: ResolveModelInput): ResolveModelResult;
export declare function validateGemTeamConfig(config: Record<string, unknown> | GemTeamPluginOptions): GemTeamConfigValidationResult;
