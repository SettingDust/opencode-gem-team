export type ComplexityTier = "simple" | "medium" | "complex"

export type ComplexityModels = Partial<Record<ComplexityTier, string>>

export type ModelResolutionSource = "native_agent_model" | "complexity_model" | "current_selected_model" | "no_model"

export type ModelResolutionStatus = "resolved" | "no_model"

export type TierNormalizationStatus = "valid" | "fallback"

export type NormalizeTierResult = {
  tier: ComplexityTier
  status: TierNormalizationStatus
  reason: "known_tier" | "missing_tier_fallback_medium" | "unknown_tier_fallback_medium"
}

export type ResolveModelInput = {
  requestedTier?: unknown
  complexityModels?: ComplexityModels
  currentSelectedModel?: string
  agent?: Readonly<{
    model?: string
    [key: string]: unknown
  }>
}

export type ResolveModelResult = {
  tier: ComplexityTier
  model?: string
  source: ModelResolutionSource
  status: ModelResolutionStatus
  reason: string
}

export type ComplexityClassificationInput = {
  orchestratorComplexity?: unknown
  plannerComplexity?: unknown
  tierHint?: unknown
  roleSlug?: string
  riskLevel?: string | number
  riskScore?: string | number
  overallRiskLevel?: string | number
  estimatedEffort?: number
  estimatedFiles?: number
  estimatedLines?: number
  requiresDesignValidation?: boolean
  requiresApproval?: boolean
  securitySensitive?: boolean
  devopsSensitive?: boolean
  productionImpact?: boolean
  reviewDepth?: "deep" | "normal" | "light" | string
}

export type ComplexityClassificationResult = {
  tier: ComplexityTier
  reasons: string[]
}

export type GemTeamConfigValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] }

export type GemTeamPluginOptions = {
  complexity_models?: ComplexityModels
}

export type GemTeamConfigSchema = {
  complexity_models?: ComplexityModels
}

export type ModelRoutingSignals = ComplexityClassificationInput

export type PreviewModelRoutingInput = {
  signals?: ModelRoutingSignals
  complexityModels?: ComplexityModels
  currentSelectedModel?: string
  agent?: ResolveModelInput["agent"]
}

export type ModelRoutingHookMutationStatus =
  | "dry_run_output_options_only"
  | "native_agent_model_preserved_no_hook_model_override"
  | "current_selected_model_fallback_no_hook_model_override"
  | "no_model_available_no_hook_model_override"

export type ModelRoutingHookMutationPreview = {
  wouldMutateOutputOptions: boolean
  optionKey?: "model"
  model?: string
  status: ModelRoutingHookMutationStatus
  reason: string
}

export type PreviewModelRoutingResult = {
  classification: ComplexityClassificationResult
  resolution: ResolveModelResult
  hookMutation: ModelRoutingHookMutationPreview
}
