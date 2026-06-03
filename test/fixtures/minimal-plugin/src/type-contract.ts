import type { Hooks, Plugin, PluginModule } from "@opencode-ai/plugin"

type Assert<T extends true> = T

type HasPluginModuleServer = PluginModule extends { server: Plugin } ? true : false
type HasOptionalId = PluginModule extends { id?: string } ? true : false
type HasConfigHook = "config" extends keyof Hooks ? true : false
type HasChatMessageHook = "chat.message" extends keyof Hooks ? true : false
type HasChatParamsHook = "chat.params" extends keyof Hooks ? true : false

export type ContractAssertions = [
  Assert<HasPluginModuleServer>,
  Assert<HasOptionalId>,
  Assert<HasConfigHook>,
  Assert<HasChatMessageHook>,
  Assert<HasChatParamsHook>,
]

export const contractPlugin = {
  id: "opencode-gem-team-contract-poc",
  server: async () => ({
    config: async () => {},
    "chat.message": async () => {},
    "chat.params": async (_input, output) => {
      output.options = { ...output.options, gemTeamPocTier: "medium" }
      // @ts-expect-error Current SDK output contract does not expose request model mutation here.
      output.model = "tier-selected-model"
    },
  }),
} satisfies PluginModule
