const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator";
const ALLOWED_TOOL_IDS = new Set(["grep", "glob"]);
const ALLOWED_PLAN_ROOT = "docs/plan";
export function createGemOrchestratorToolGuard(client, directory) {
    return async function gemOrchestratorToolGuard(input, output) {
        void input.callID;
        if (!ALLOWED_TOOL_IDS.has(input.tool))
            return;
        const session = await client.session.get({
            path: { id: input.sessionID },
            query: { directory },
        });
        if (session.data?.agent !== GEM_ORCHESTRATOR_SLUG)
            return;
        const normalizedPath = normalizeToolPath(output.args.path);
        if (normalizedPath !== undefined && isAllowedDocsPlanPath(normalizedPath))
            return;
        throw new Error(`gem-orchestrator path restriction: ${input.tool} is only allowed for docs/plan/**. `
            + `Delegate searches outside docs/plan/** to the appropriate subagent.`);
    };
}
export function normalizeToolPath(pathValue) {
    if (typeof pathValue !== "string")
        return undefined;
    const trimmed = pathValue.trim();
    if (!trimmed)
        return undefined;
    return trimmed.replace(/\\+/g, "/").replace(/\/+$/g, "");
}
export function isAllowedDocsPlanPath(pathValue) {
    return pathValue === ALLOWED_PLAN_ROOT || pathValue.startsWith(`${ALLOWED_PLAN_ROOT}/`);
}
//# sourceMappingURL=tool-guard.js.map