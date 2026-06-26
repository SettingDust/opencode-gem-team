const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator"
const ALLOWED_TOOL_IDS = new Set(["grep", "glob"])
const ALLOWED_PLAN_ROOT = "docs/plan"

type ToolExecuteBeforeInput = {
  tool: string
  sessionID: string
  callID: string
}

type ToolExecuteBeforeOutput = {
  args: {
    path?: unknown
    [key: string]: unknown
  }
}

export function createGemOrchestratorToolGuard(client: any, directory: string) {
  return async function gemOrchestratorToolGuard(input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput): Promise<void> {
    void input.callID

    if (!ALLOWED_TOOL_IDS.has(input.tool)) return

    const session = await client.session.get({
      path: { id: input.sessionID },
      query: { directory },
    })

    if (session.data?.agent !== GEM_ORCHESTRATOR_SLUG) return

    const normalizedPath = normalizeToolPath(output.args.path)
    if (normalizedPath !== undefined && isAllowedDocsPlanPath(normalizedPath)) return

    throw new Error(
      `gem-orchestrator path restriction: ${input.tool} is only allowed for docs/plan/**. `
      + `Delegate searches outside docs/plan/** to the appropriate subagent.`,
    )
  }
}

export function normalizeToolPath(pathValue: unknown): string | undefined {
  if (typeof pathValue !== "string") return undefined

  const trimmed = pathValue.trim()
  if (!trimmed) return undefined

  return trimmed.replace(/\\+/g, "/").replace(/\/+$/g, "")
}

export function isAllowedDocsPlanPath(pathValue: string): boolean {
  return pathValue === ALLOWED_PLAN_ROOT || pathValue.startsWith(`${ALLOWED_PLAN_ROOT}/`)
}
