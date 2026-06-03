import type { PluginInput, Hooks } from "@opencode-ai/plugin"

import type { OpenCodeAgentConfig, OpenCodeConfigWithAgents } from "./config.js"
import { classifyComplexityTier } from "../routing/complexity.js"
import { resolveModel } from "../routing/resolve-model.js"
import type {
  ComplexityClassificationInput,
  GemTeamPluginOptions,
  ModelRoutingHookMutationPreview,
  PreviewModelRoutingInput,
  PreviewModelRoutingResult,
  RoutingSessionNotifier,
  RoutingSessionPayload,
} from "../types.js"

type ChatParamsHook = NonNullable<Hooks["chat.params"]>
type ChatParamsInput = Parameters<ChatParamsHook>[0]
type ChatParamsOutput = Parameters<ChatParamsHook>[1]
type ConfigProvider = () => OpenCodeConfigWithAgents | undefined
type SessionPromptRequest = {
  sessionID: string
  noReply: true
  parts: [{ type: "text"; text: string; ignored: true }]
}
type SessionPromptMethod = (request: SessionPromptRequest) => Promise<unknown>

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
  notifyRoutingSession?: RoutingSessionNotifier,
): Pick<Hooks, "chat.params"> {
  return {
    "chat.params": async (input, output) => {
      await applyChatParamsModelRouting(input, output, options, getConfig(), notifyRoutingSession)
    },
  }
}

export async function applyChatParamsModelRouting(
  input: ChatParamsInput,
  output: ChatParamsOutput,
  options: GemTeamPluginOptions = {},
  config?: OpenCodeConfigWithAgents,
  notifyRoutingSession?: RoutingSessionNotifier,
): Promise<PreviewModelRoutingResult> {
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

  if (preview.resolution.model !== undefined) {
    await notifyRoutingSession?.({
      sessionID: input.sessionID,
      agent: input.agent,
      tier: preview.resolution.tier,
      source: preview.resolution.source,
      model: preview.resolution.model,
    })
  }

  return preview
}

export function createRoutingSessionNotifier(client: PluginInput["client"] | undefined): RoutingSessionNotifier {
  const shown = new Set<string>()
  const prompt = resolveSessionPrompt(client)

  return async (payload) => {
    if (prompt === undefined) return

    const dedupeKey = routingSessionKey(payload)
    if (shown.has(dedupeKey)) return

    const text = formatRoutingSessionMessage(payload)
    const parts: SessionPromptRequest["parts"] = [{ type: "text", text, ignored: true }]

    try {
      await prompt({
        sessionID: payload.sessionID,
        noReply: true,
        parts,
      })
      shown.add(dedupeKey)
    } catch {
      // Silent skip: session notifications are best-effort only.
    }
  }
}

function resolveSessionPrompt(client: PluginInput["client"] | undefined): SessionPromptMethod | undefined {
  const session = client?.session
  if (session === undefined) return undefined
  if (typeof session.promptAsync === "function") {
    return async (request) => {
      try {
        return await session.promptAsync(request as never)
      } catch {
        return await session.promptAsync({
          path: { id: request.sessionID },
          body: {
            noReply: request.noReply,
            parts: request.parts,
          },
        } as never)
      }
    }
  }
  if (typeof session.prompt === "function") {
    return async (request) => {
      try {
        return await session.prompt(request as never)
      } catch {
        return await session.prompt({
          path: { id: request.sessionID },
          body: {
            noReply: request.noReply,
            parts: request.parts,
          },
        } as never)
      }
    }
  }
  return undefined
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

function routingSessionKey(payload: RoutingSessionPayload): string {
  return [payload.sessionID, payload.agent, payload.tier, payload.source, payload.model].join("|")
}

function formatRoutingSessionMessage(payload: RoutingSessionPayload): string {
  return `${payload.agent} · ${routingSessionSourceLabel(payload.source)} · ${payload.model}`
}

function routingSessionSourceLabel(source: RoutingSessionPayload["source"]): string {
  switch (source) {
    case "native_agent_model":
      return "agent model"
    case "complexity_model":
      return "tier route"
    case "current_selected_model":
      return "selected model"
    case "no_model":
      return "no model"
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
