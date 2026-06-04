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
  path: { id: string }
  query: { directory: string }
  body: {
    noReply: true
    parts: [{ type: "text"; text: string; ignored: true }]
  }
}
type SessionPromptMethod = (request: SessionPromptRequest) => Promise<unknown> | unknown

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
      classificationReasons: preview.classification.reasons,
      resolutionReason: preview.resolution.reason,
    })
  }

  return preview
}

export function createRoutingSessionNotifier(client: PluginInput["client"] | undefined): RoutingSessionNotifier {
  const shown = new Set<string>()
  const sessionPrompt = resolveSessionPrompt(client)

  return async (payload) => {
    if (sessionPrompt === undefined) return

    const dedupeKey = routingSessionKey(payload)
    if (shown.has(dedupeKey)) return

    const text = formatRoutingSessionMessage(payload)
    const request = buildSessionPromptRequest(payload.sessionID, text)

    try {
      await sessionPrompt(request)
      shown.add(dedupeKey)
    } catch {
      // Silent skip: routing notices are best-effort only.
    }
  }
}

function resolveSessionPrompt(client: PluginInput["client"] | undefined): SessionPromptMethod | undefined {
  const session = client?.session as { prompt?: (request: SessionPromptRequest) => Promise<unknown> | unknown } | undefined
  if (typeof session?.prompt === "function") {
    return (request) => session.prompt?.(request)
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

function buildSessionPromptRequest(sessionID: string, text: string): SessionPromptRequest {
  return {
    path: { id: sessionID },
    query: { directory: process.cwd() },
    body: {
      noReply: true,
      parts: [{ type: "text", text, ignored: true }],
    },
  }
}

function formatRoutingSessionMessage(payload: RoutingSessionPayload): string {
  const agentName = routingAgentDisplayName(payload.agent)
  const sourceLabel = routingModelSourceLabel(payload)
  const tierReason = routingTierReasonLabel(payload)
  const signalLabels = routingSignalLabels(payload)

  return [
    "Model routing",
    `Agent: ${agentName} (${payload.agent})`,
    `Tier: ${payload.tier} (${tierReason})`,
    `Source: ${sourceLabel}`,
    `Model: ${payload.model}`,
    `Reasons: ${signalLabels.join("; ")}`,
  ].join("\n")
}

function routingModelSourceLabel(payload: RoutingSessionPayload): string {
  switch (payload.source) {
    case "native_agent_model":
      return "agent model"
    case "complexity_model":
      return `plugin complexity_models.${payload.tier}`
    case "current_selected_model":
      return "current selected model"
    case "no_model":
      return "no model"
  }
}

function routingTierReasonLabel(payload: RoutingSessionPayload): string {
  const criticalRoleState = routingCriticalRoleState(payload.classificationReasons)
  if (criticalRoleState === "escalate") return "critical role escalation"
  if (criticalRoleState === "boost") return "critical role boost"
  if (criticalRoleState === "hint") return "critical role complex"
  const reasons = payload.classificationReasons ?? []
  if (reasons.some((reason) => reason.startsWith("risk_upgrade_"))) return "risk upgrade"
  if (reasons.includes("complexity_signal_highest_tier")) return "complexity signal"
  if (reasons.includes("missing_complexity_signal_default_medium")) return "default heuristic"
  if (payload.resolutionReason?.includes("fallback")) return "fallback"
  return "resolved"
}

function routingSignalLabels(payload: RoutingSessionPayload): string[] {
  const labels: string[] = []
  const reasons = payload.classificationReasons ?? []

  const criticalRoleState = routingCriticalRoleState(reasons)
  if (criticalRoleState === "escalate") labels.push("critical role escalation")
  if (criticalRoleState === "boost") labels.push("critical role boost")
  if (criticalRoleState === "hint") labels.push("critical role complex")
  if (reasons.includes("complexity_signal_highest_tier")) labels.push("complexity")
  if (reasons.some((reason) => reason.startsWith("risk_upgrade_"))) labels.push("risk")
  if (reasons.includes("missing_complexity_signal_default_medium")) labels.push("default complexity")
  if (payload.resolutionReason?.includes("fallback")) labels.push("fallback")

  if (labels.length === 0) {
    switch (payload.source) {
      case "native_agent_model":
        labels.push("agent model")
        break
      case "complexity_model":
        labels.push("plugin tier model")
        break
      case "current_selected_model":
        labels.push("current model")
        break
      case "no_model":
        labels.push("no model")
        break
    }
  }

  return labels.slice(0, 3)
}

function routingCriticalRoleState(reasons: string[] | undefined): "escalate" | "boost" | "hint" | undefined {
  if (reasons === undefined) return undefined
  if (reasons.some(isCriticalRoleEscalationReason)) return "escalate"
  if (reasons.some(isCriticalRoleBoostReason)) return "boost"
  if (reasons.some(isCriticalRoleHintReason)) return "hint"
  return undefined
}

function isCriticalRoleHintReason(reason: string): boolean {
  return reason === "critical_role_hint"
}

function isCriticalRoleEscalationReason(reason: string): boolean {
  return reason === "critical_role_escalate_medium_to_complex"
    || reason === "critical_role_escalate_simple_to_complex"
}

function isCriticalRoleBoostReason(reason: string): boolean {
  return reason === "critical_role_boost_simple_to_medium"
}

function routingAgentDisplayName(agent: string): string {
  return agentDisplayNames[agent] ?? agent
}

const agentDisplayNames: Record<string, string> = {
  "gem-browser-tester": "Browser Tester",
  "gem-code-simplifier": "Code Simplifier",
  "gem-critic": "Critic",
  "gem-debugger": "Debugger",
  "gem-designer-mobile": "Mobile Designer",
  "gem-designer": "Designer",
  "gem-devops": "DevOps",
  "gem-documentation-writer": "Documentation Writer",
  "gem-implementer-mobile": "Mobile Implementer",
  "gem-implementer": "Implementer",
  "gem-mobile-tester": "Mobile Tester",
  "gem-orchestrator": "Orchestrator",
  "gem-planner": "Planner",
  "gem-researcher": "Researcher",
  "gem-reviewer": "Reviewer",
  "gem-skill-creator": "Skill Creator",
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
