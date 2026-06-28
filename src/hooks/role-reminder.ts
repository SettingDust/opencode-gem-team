import type { Hooks } from "@opencode-ai/plugin"

type RoleReminderState = {
  turns: number
  lastTool: string | undefined
}

const ROLE_REMINDER_TURN_INTERVAL = 8
export const ROLE_REMINDER_TEXT =
  "Remember: follow your agent role and instructions as defined in your system prompt."

const sessionState = new Map<string, RoleReminderState>()

function getSessionState(sessionID: string): RoleReminderState {
  const existing = sessionState.get(sessionID)

  if (existing) {
    return existing
  }

  const created: RoleReminderState = {
    turns: 0,
    lastTool: undefined,
  }

  sessionState.set(sessionID, created)
  return created
}

function shouldInjectReminder(state: RoleReminderState): boolean {
  return (state.turns > 0 && state.turns % ROLE_REMINDER_TURN_INTERVAL === 0) || state.lastTool === "task"
}

export function createRoleReminderHooks(): Pick<Hooks, "chat.message" | "tool.execute.after" | "experimental.chat.system.transform"> {
  return {
    "chat.message": async (input) => {
      const sessionID = input?.sessionID

      if (!sessionID) {
        return
      }

      getSessionState(sessionID).turns += 1
    },
    "tool.execute.after": async (input) => {
      const sessionID = input?.sessionID

      if (!sessionID) {
        return
      }

      getSessionState(sessionID).lastTool = input?.tool
    },
    "experimental.chat.system.transform": async (input, output) => {
      const sessionID = input?.sessionID

      if (!sessionID || !Array.isArray(output?.system)) {
        return
      }

      const state = sessionState.get(sessionID)

      if (!state || !shouldInjectReminder(state)) {
        return
      }

      if (!output.system.includes(ROLE_REMINDER_TEXT)) {
        output.system.push(ROLE_REMINDER_TEXT)
      }

      state.lastTool = undefined
    },
  }
}

export function resetRoleReminderState(): void {
  sessionState.clear()
}
