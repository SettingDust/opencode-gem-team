import assert from "node:assert/strict"
import { describe, it, beforeEach } from "node:test"

import { createRoleReminderHooks, resetRoleReminderState, ROLE_REMINDER_TEXT } from "../src/hooks/role-reminder.js"

describe("role reminder hooks", () => {
  beforeEach(() => {
    resetRoleReminderState()
  })

  it("injects the reminder once after every 8th turn following a task tool", async () => {
    const hooks = createRoleReminderHooks()
    const sessionID = "session-1"

    for (let turn = 0; turn < 8; turn += 1) {
      await hooks["chat.message"]?.({ sessionID } as never, { message: {} as never, parts: [] })
    }

    await hooks["tool.execute.after"]?.({ sessionID, tool: "task", callID: "call-1", args: {} } as never, {
      title: "task",
      output: "done",
      metadata: {},
    })

    const output = { system: ["existing"] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID, model: {} as never } as never, output)
    await hooks["experimental.chat.system.transform"]?.({ sessionID, model: {} as never } as never, output)

    assert.deepEqual(output.system, ["existing", ROLE_REMINDER_TEXT])
  })

  it("injects on every 8th turn even when the last tool was not task", async () => {
    const hooks = createRoleReminderHooks()
    const sessionID = "session-2"

    for (let turn = 0; turn < 8; turn += 1) {
      await hooks["chat.message"]?.({ sessionID } as never, { message: {} as never, parts: [] })
    }

    await hooks["tool.execute.after"]?.({ sessionID, tool: "shell", callID: "call-2", args: {} } as never, {
      title: "shell",
      output: "done",
      metadata: {},
    })

    const output = { system: ["existing"] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID, model: {} as never } as never, output)

    assert.deepEqual(output.system, ["existing", ROLE_REMINDER_TEXT])
  })

  it("injects after a task tool even before the 8th turn", async () => {
    const hooks = createRoleReminderHooks()
    const sessionID = "session-3"

    await hooks["chat.message"]?.({ sessionID } as never, { message: {} as never, parts: [] })
    await hooks["tool.execute.after"]?.({ sessionID, tool: "task", callID: "call-3", args: {} } as never, {
      title: "task",
      output: "done",
      metadata: {},
    })

    const output = { system: ["existing"] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID, model: {} as never } as never, output)

    assert.deepEqual(output.system, ["existing", ROLE_REMINDER_TEXT])
  })
})
