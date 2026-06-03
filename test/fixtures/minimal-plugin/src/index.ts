import type { Hooks, Plugin, PluginModule } from "@opencode-ai/plugin"

const server: Plugin = async () => {
  const hooks: Hooks = {
    config: async (config) => {
      config.agent ??= {}
      const agents = config.agent as Record<string, Record<string, unknown>>
      agents["gem-poc"] ??= {
        mode: "subagent",
        description: "PoC-only injected agent without model defaults.",
        prompt: "PoC-only prompt.",
      }
    },
    "chat.message": async (_input, output) => {
      output.parts = output.parts
    },
    "chat.params": async (_input, output) => {
      output.options = { ...output.options, gemTeamPocTier: "medium" }
    },
  }

  return hooks
}

export default {
  id: "opencode-gem-team-poc",
  server,
} satisfies PluginModule
