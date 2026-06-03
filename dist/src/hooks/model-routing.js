import { classifyComplexityTier } from "../routing/complexity.js";
import { resolveModel } from "../routing/resolve-model.js";
export function previewModelRouting(input) {
    const classification = classifyComplexityTier(input.signals);
    const resolution = resolveModel({
        requestedTier: classification.tier,
        complexityModels: input.complexityModels,
        currentSelectedModel: input.currentSelectedModel,
        agent: input.agent,
    });
    return {
        classification,
        resolution,
        hookMutation: previewHookMutation(resolution),
    };
}
export function createModelRoutingHooks(options = {}, getConfig = () => undefined, notifyRoutingSession) {
    return {
        "chat.params": async (input, output) => {
            await applyChatParamsModelRouting(input, output, options, getConfig(), notifyRoutingSession);
        },
    };
}
export async function applyChatParamsModelRouting(input, output, options = {}, config, notifyRoutingSession) {
    const agentConfig = config?.agent?.[input.agent];
    const preview = previewModelRouting({
        signals: signalsFromChatParams(input),
        complexityModels: options.complexity_models,
        currentSelectedModel: input.model.id,
        agent: agentConfig,
    });
    if (preview.hookMutation.wouldMutateOutputOptions && preview.hookMutation.model !== undefined) {
        output.options.model = preview.hookMutation.model;
    }
    output.options.gemTeamModelRouting = {
        status: preview.hookMutation.status,
        tier: preview.resolution.tier,
        source: preview.resolution.source,
        reason: preview.resolution.reason,
    };
    if (preview.resolution.model !== undefined) {
        await notifyRoutingSession?.({
            sessionID: input.sessionID,
            agent: input.agent,
            tier: preview.resolution.tier,
            source: preview.resolution.source,
            model: preview.resolution.model,
        });
    }
    return preview;
}
export function createRoutingSessionNotifier(client) {
    const shown = new Set();
    const prompt = resolveSessionPrompt(client);
    return async (payload) => {
        if (prompt === undefined)
            return;
        const dedupeKey = routingSessionKey(payload);
        if (shown.has(dedupeKey))
            return;
        const text = formatRoutingSessionMessage(payload);
        const parts = [{ type: "text", text, ignored: true }];
        try {
            await prompt({
                sessionID: payload.sessionID,
                noReply: true,
                parts,
            });
            shown.add(dedupeKey);
        }
        catch {
            // Silent skip: session notifications are best-effort only.
        }
    };
}
function resolveSessionPrompt(client) {
    const session = client?.session;
    if (session === undefined)
        return undefined;
    if (typeof session.promptAsync === "function") {
        return async (request) => {
            try {
                return await session.promptAsync(request);
            }
            catch {
                return await session.promptAsync({
                    path: { id: request.sessionID },
                    body: {
                        noReply: request.noReply,
                        parts: request.parts,
                    },
                });
            }
        };
    }
    if (typeof session.prompt === "function") {
        return async (request) => {
            try {
                return await session.prompt(request);
            }
            catch {
                return await session.prompt({
                    path: { id: request.sessionID },
                    body: {
                        noReply: request.noReply,
                        parts: request.parts,
                    },
                });
            }
        };
    }
    return undefined;
}
function previewHookMutation(resolution) {
    if (resolution.source === "complexity_model" && resolution.model !== undefined) {
        return {
            wouldMutateOutputOptions: true,
            optionKey: "model",
            model: resolution.model,
            status: "dry_run_output_options_only",
            reason: "sdk_chat_params_output_exposes_options_not_direct_model_field",
        };
    }
    if (resolution.source === "native_agent_model") {
        return {
            wouldMutateOutputOptions: false,
            status: "native_agent_model_preserved_no_hook_model_override",
            reason: "native_agent_model_preserved_no_hook_model_override",
        };
    }
    if (resolution.source === "current_selected_model") {
        return {
            wouldMutateOutputOptions: false,
            status: "current_selected_model_fallback_no_hook_model_override",
            reason: "current_selected_model_already_active_no_hook_model_override",
        };
    }
    return {
        wouldMutateOutputOptions: false,
        status: "no_model_available_no_hook_model_override",
        reason: "no_resolved_model_available_for_hook_output",
    };
}
function routingSessionKey(payload) {
    return [payload.sessionID, payload.agent, payload.tier, payload.source, payload.model].join("|");
}
function formatRoutingSessionMessage(payload) {
    return `${payload.agent} · ${routingSessionSourceLabel(payload.source)} · ${payload.model}`;
}
function routingSessionSourceLabel(source) {
    switch (source) {
        case "native_agent_model":
            return "agent model";
        case "complexity_model":
            return "tier route";
        case "current_selected_model":
            return "selected model";
        case "no_model":
            return "no model";
    }
}
function signalsFromChatParams(input) {
    const messageSignals = recordValue(input.message.gemTeam)
        ?? recordValue(input.message.gem_team)
        ?? recordValue(input.message.routing)
        ?? {};
    return {
        ...messageSignals,
        roleSlug: stringValue(messageSignals.roleSlug) ?? stringValue(messageSignals.agent) ?? input.agent,
        tierHint: messageSignals.tierHint ?? messageSignals.tier,
    };
}
function recordValue(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}
function stringValue(value) {
    return typeof value === "string" ? value : undefined;
}
//# sourceMappingURL=model-routing.js.map