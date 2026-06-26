type ToolExecuteBeforeInput = {
    tool: string;
    sessionID: string;
    callID: string;
};
type ToolExecuteBeforeOutput = {
    args: {
        path?: unknown;
        [key: string]: unknown;
    };
};
export declare function createGemOrchestratorToolGuard(client: any, directory: string): (input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput) => Promise<void>;
export declare function normalizeToolPath(pathValue: unknown): string | undefined;
export declare function isAllowedDocsPlanPath(pathValue: string): boolean;
export {};
