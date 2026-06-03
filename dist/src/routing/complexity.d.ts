import type { ComplexityClassificationInput, ComplexityClassificationResult, ComplexityTier, NormalizeTierResult } from "../types.js";
export declare function isComplexityTier(value: unknown): value is ComplexityTier;
export declare function normalizeComplexityTier(value?: unknown): NormalizeTierResult;
export declare function classifyComplexityTier(input?: ComplexityClassificationInput): ComplexityClassificationResult;
