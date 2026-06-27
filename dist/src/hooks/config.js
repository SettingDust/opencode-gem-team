import { getGeneratedGemTeamAgents, getGemOrchestratorRoutingTargets } from "../agents/generated-loader.js";
export const GEM_TEAM_AGENT_COUNT = 16;
const GEM_ORCHESTRATOR_SLUG = "gem-orchestrator";
export const GEM_ORCHESTRATOR_PROMPT_NOTICE = `## IMPORTANT NOTICE about your workflow

You are the orchestrator. Before EVERY action, output a decision block, then carry out that action in the same turn:

Phase: <current phase>
Complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
Action: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>
Decision: <how your Complexity + Action + agent rules lead to the path - start it yourself or delegate to which subagent>

Action is one or more of the listed verbs (combine with \` + \`). Keep Decision to the routing path and its outcome; put any other context in normal prose after the block. When your Decision is to delegate, you MUST actually call the \`task\` tool.

At workflow checkpoints - after Phase 2 plan generation/loading and after each Phase 3 wave - output a checkpoint block, then continue in the same turn:

Current phase: <2 | 3>
Complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
Wave completed: <N, or n/a outside Phase 3>
Action: <research | plan | implement | review | critic | debug | document | design | test | devops | simplify | skill>
Decision: <how your Complexity + Action + agent rules lead to the path - start it yourself or delegate to which subagent>
`;
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