import type { Hooks } from "@opencode-ai/plugin"

import type { OpenCodeAgentConfig, OpenCodeConfigWithAgents } from "./config.js"
import { classifyComplexityTier } from "../routing/complexity.js"
import { resolveModel } from "../routing/resolve-model.js"
import type {
  ComplexityClassificationInput,
  GemTeamPluginOptions,
  ModelRoutingHookMutationPreview,
  PreviewModelRoutingInput,
  PreviewModelRoutingResult,
} from "../types.js"

type ChatParamsHook = NonNullable<Hooks["chat.params"]>
type ChatParamsInput = Parameters<ChatParamsHook>[0]
type ChatParamsOutput = Parameters<ChatParamsHook>[1]
type ConfigProvider = () => OpenCodeConfigWithAgents | undefined

export function previewModelRouting(input: PreviewModelRoutingInput): PreviewModelRoutingResult {
  const classification = classifyComplexityTier(input.signals)
  const resolution = resolveModel({
    requestedTier: classification.tier,
    complexityModels: input.complexityModels,
    currentSelectedModel: input.currentSelectedModel,
    agent: input.agent,
  })

  return {
    classification,
    resolution,
    hookMutation: previewHookMutation(resolution),
  }
}

export function createModelRoutingHooks(
  options: GemTeamPluginOptions = {},
  getConfig: ConfigProvider = () => undefined,
): Pick<Hooks, "chat.params"> {
  return {
    "chat.params": async (input, output) => {
      applyChatParamsModelRouting(input, output, options, getConfig())
    },
  }
}

export function applyChatParamsModelRouting(
  input: ChatParamsInput,
  output: ChatParamsOutput,
  options: GemTeamPluginOptions = {},
  config?: OpenCodeConfigWithAgents,
): PreviewModelRoutingResult {
  const agentConfig = config?.agent?.[input.agent]
  const preview = previewModelRouting({
    signals: signalsFromChatParams(input),
    complexityModels: options.complexity_models,
    currentSelectedModel: input.model.id,
    agent: agentConfig,
  })

  if (preview.hookMutation.wouldMutateOutputOptions && preview.hookMutation.model !== undefined) {
    output.options.model = preview.hookMutation.model
  }

  output.options.gemTeamModelRouting = {
    status: preview.hookMutation.status,
    tier: preview.resolution.tier,
    source: preview.resolution.source,
    reason: preview.resolution.reason,
  }

  return preview
}

function previewHookMutation(resolution: PreviewModelRoutingResult["resolution"]): ModelRoutingHookMutationPreview {
  if (resolution.source === "complexity_model" && resolution.model !== undefined) {
    return {
      wouldMutateOutputOptions: true,
      optionKey: "model",
      model: resolution.model,
      status: "dry_run_output_options_only",
      reason: "sdk_chat_params_output_exposes_options_not_direct_model_field",
    }
  }

  if (resolution.source === "native_agent_model") {
    return {
      wouldMutateOutputOptions: false,
      status: "native_agent_model_preserved_no_hook_model_override",
      reason: "native_agent_model_preserved_no_hook_model_override",
    }
  }

  if (resolution.source === "current_selected_model") {
    return {
      wouldMutateOutputOptions: false,
      status: "current_selected_model_fallback_no_hook_model_override",
      reason: "current_selected_model_already_active_no_hook_model_override",
    }
  }

  return {
    wouldMutateOutputOptions: false,
    status: "no_model_available_no_hook_model_override",
    reason: "no_resolved_model_available_for_hook_output",
  }
}

function signalsFromChatParams(input: ChatParamsInput): ComplexityClassificationInput {
  const messageSignals = recordValue((input.message as Record<string, unknown>).gemTeam)
    ?? recordValue((input.message as Record<string, unknown>).gem_team)
    ?? recordValue((input.message as Record<string, unknown>).routing)
    ?? {}

  return {
    ...messageSignals,
    roleSlug: stringValue(messageSignals.roleSlug) ?? stringValue(messageSignals.agent) ?? input.agent,
    tierHint: messageSignals.tierHint ?? messageSignals.tier,
  }
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

export type { ChatParamsInput, ChatParamsOutput, OpenCodeAgentConfig }
