import { randomUUID } from "crypto";
export const ROLE_REMINDER_TEXT = "You are the gem-orchestrator. Follow Phase 0->4 strictly. Never execute project_work directly - always delegate by calling the `task` tool.";
const ROLE_REMINDER_SUFFIX = `\n<system-reminder>${ROLE_REMINDER_TEXT}</system-reminder>`;
export function createRoleReminderHooks() {
    return {
        "chat.message": async (input, output) => {
            if (input.agent !== "gem-orchestrator")
                return;
            const sessionID = input.sessionID;
            const messageID = input.messageID;
            if (typeof sessionID !== "string" || typeof messageID !== "string")
                return;
            const reminderPart = {
                type: "text",
                text: ROLE_REMINDER_SUFFIX,
                id: randomUUID(),
                messageID,
                sessionID,
            };
            output?.parts?.push(reminderPart);
        },
    };
}
export function resetRoleReminderState() {
    void 0;
}
//# sourceMappingURL=role-reminder.js.map