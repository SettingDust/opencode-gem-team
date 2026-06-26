import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js";
export const GEM_TEAM_AGENT_COUNT = 16;
const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator";
export const GEM_ORCHESTRATOR_PROMPT_NOTICE = `## IMPORTANT NOTICE about your workflow

You are the orchestrator. Before EVERY action - delegating via \`task\`, updating plan bookkeeping under \`docs/plan/*\`, running git, clarifying, or anything else - you MUST first output a decision block:

Phase: <current phase>
Action type: <delegate | plan-bookkeeping | git | clarify | ...>
Target: <gem-<slug> when delegating, otherwise the file or command>
Reasoning: <why this action and target fit the current phase and your workflow/role>

Only after emitting this block may you act. Acting without a verbalized decision block is a workflow violation.

When a tool call fails, analyze the error first:
- Schema/parameter error (\`invalid_params\`, missing required field) -> fix the parameter and retry
- Permission denied (\`permission_denied\`) -> delegate the action to the appropriate subagent; do not retry
- File/resource not found -> verify the path is correct (use relative paths, not absolute); retry or delegate discovery
- Other errors -> determine if it's transient (retry), a blocker (escalate), or requires delegation

Do not silently give up after one failure. Think through the cause and choose the appropriate recovery path.

When calling tools, always use relative paths (relative to project root), not absolute paths - this ensures permission patterns match correctly.

At workflow checkpoints, output a checkpoint block before proceeding:

After Phase 2 (plan generated or loaded):
Current phase: 2
Complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
Next step: <...>

After Phase 3 wave completion:
Current phase: 3
Wave completed: <N>
Complexity: <MEDIUM|HIGH>
Next step: <...>`;
export function injectGemTeamAgents(config) {
    config.agent ??= {};
    for (const generated of getGeneratedGemTeamAgents()) {
        const existing = config.agent[generated.slug];
        const base = {
            description: generated.description,
            mode: generated.mode,
            prompt: generated.prompt,
        };
        if (generated.slug === GEM_ORCHESTRATOR_SLUG) {
            base.prompt = generated.prompt ? `${generated.prompt}\n\n${GEM_ORCHESTRATOR_PROMPT_NOTICE}` : GEM_ORCHESTRATOR_PROMPT_NOTICE;
        }
        config.agent[generated.slug] = existing ? mergeMissingAgentFields(existing, base) : base;
    }
}
export { getGemOrchestratorRoutingTargets };
function mergeMissingAgentFields(existing, generated) {
    return {
        ...generated,
        ...existing,
    };
}
//# sourceMappingURL=config.js.map