import assert from "node:assert/strict"
import { describe, it, beforeEach } from "node:test"

import { createRoleReminderHooks, resetRoleReminderState, ROLE_REMINDER_TEXT } from "../src/hooks/role-reminder.js"

type TestPart = Record<string, unknown> & { type: string; text?: string }

describe("role reminder hooks", () => {
  beforeEach(() => {
    resetRoleReminderState()
  })

  it("pushes the reminder as a new text part", async () => {
    const hooks = createRoleReminderHooks()

    const output = {
      message: {},
      parts: [{ type: "text", text: "hello" } as TestPart],
    }

    await hooks["chat.message"]?.(
      { sessionID: "ses_1", messageID: "msg_1", agent: "gem-orchestrator" } as never,
      output as never,
    )

    assert.equal(output.parts[1]?.type, "text")
    assert.equal(output.parts[1]?.text, `\n<system-reminder>${ROLE_REMINDER_TEXT}</system-reminder>`)
    assert.equal(output.parts[1]?.messageID, "msg_1")
    assert.equal(output.parts[1]?.sessionID, "ses_1")
    assert.equal(typeof output.parts[1]?.id, "string")
    assert.match(output.parts[1]?.id as string, /^[0-9a-f-]{36}$/)
  })

  it("skips injection when durable message fields are missing", async () => {
    const hooks = createRoleReminderHooks()

    const output = {
      message: {},
      parts: [{ type: "text", text: "hello" } as TestPart],
    }

    await hooks["chat.message"]?.({ sessionID: "ses_1", agent: "gem-orchestrator" } as never, output as never)

    assert.deepEqual(output.parts, [{ type: "text", text: "hello" }])
  })

  it("skips injection when durable message fields are not strings", async () => {
    const hooks = createRoleReminderHooks()

    const output = {
      message: {},
      parts: [{ type: "text", text: "hello" } as TestPart],
    }

    await hooks["chat.message"]?.({ sessionID: 1, messageID: "msg_1", agent: "gem-orchestrator" } as never, output as never)

    assert.deepEqual(output.parts, [{ type: "text", text: "hello" }])
  })

  it("pushes durable event fields on the reminder part", async () => {
    const hooks = createRoleReminderHooks()

    const output = {
      message: {},
      parts: [] as TestPart[],
    }

    await hooks["chat.message"]?.(
      { sessionID: "ses_2", messageID: "msg_2", agent: "gem-orchestrator" } as never,
      output as never,
    )

    assert.deepEqual({ ...output.parts[0], id: "<uuid>" }, {
      type: "text",
      text: `\n<system-reminder>${ROLE_REMINDER_TEXT}</system-reminder>`,
      id: "<uuid>",
      messageID: "msg_2",
      sessionID: "ses_2",
    })
  })

  it("preserves existing parts while adding the reminder", async () => {
    const hooks = createRoleReminderHooks()

    const output = {
      message: {},
      parts: [
        { type: "text", text: "alpha" },
        { type: "text", text: "beta" },
      ] as TestPart[],
    }

    await hooks["chat.message"]?.(
      { sessionID: "ses_1", messageID: "msg_1", agent: "gem-orchestrator" } as never,
      output as never,
    )

    assert.deepEqual(output.parts.slice(0, 2), [
      { type: "text", text: "alpha" },
      { type: "text", text: "beta" },
    ])
    assert.equal(output.parts[2]?.type, "text")
    assert.equal(output.parts[2]?.text, `\n<system-reminder>${ROLE_REMINDER_TEXT}</system-reminder>`)
    assert.equal(output.parts[2]?.messageID, "msg_1")
    assert.equal(output.parts[2]?.sessionID, "ses_1")
    assert.equal(typeof output.parts[2]?.id, "string")
  })

  it("skips defensively when parts are missing", async () => {
    const hooks = createRoleReminderHooks()
    const output = { message: {} }

    await hooks["chat.message"]?.({} as never, output as never)

    assert.deepEqual(output, { message: {} })
  })

  it("skips injection for non-orchestrator agents", async () => {
    const hooks = createRoleReminderHooks()

    const output = {
      message: {},
      parts: [{ type: "text", text: "hello" } as TestPart],
    }

    await hooks["chat.message"]?.({ sessionID: "ses_1", messageID: "msg_1", agent: "gem-researcher" } as never, output as never)

    assert.deepEqual(output.parts, [{ type: "text", text: "hello" }])
  })
})
