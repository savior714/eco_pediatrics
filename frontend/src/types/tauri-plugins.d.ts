declare module "@tauri-apps/plugin-http" {
    export const fetch: typeof globalThis.fetch;
}

declare module "@tauri-apps/plugin-log" {
    export function info(message: string): Promise<void>;
    export function warn(message: string): Promise<void>;
    export function error(message: string): Promise<void>;
    export function debug(message: string): Promise<void>;
    export function trace(message: string): Promise<void>;
}
