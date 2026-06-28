import type { Hooks } from "@opencode-ai/plugin";
export declare const ROLE_REMINDER_TEXT = "You are the gem-orchestrator. Follow Phase 0->4 strictly. Never execute project_work directly - always delegate by calling the `task` tool.";
export declare function createRoleReminderHooks(): Pick<Hooks, "chat.message">;
export declare function resetRoleReminderState(): void;
