import { FetchInterceptor } from "@mswjs/interceptors/fetch";

export type LogEntry = {
  type: "console" | "network";
  level: "error" | "warn" | "info";
  message: string;
  timestamp: string;
  url?: string;
  status?: number;
};

const logs: LogEntry[] = [];

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function clearLogs(): void {
  logs.length = 0;
}

function addLog(entry: LogEntry) {
  logs.push(entry);
  if (logs.length > 100) {
    logs.shift();
    console.log("[logger captured]", entry);
  }
}

export function initLogger() {
  // Override console methods
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    addLog({
      type: "console",
      level: "error",
      message: args.map(String).join(" "),
      timestamp: new Date().toISOString(),
    });
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    addLog({
      type: "console",
      level: "warn",
      message: args.map(String).join(" "),
      timestamp: new Date().toISOString(),
    });
    originalWarn(...args);
  };

  // Intercept failed network requests
  const interceptor = new FetchInterceptor();

  interceptor.apply();

  interceptor.on("response", ({ response, request }) => {
    if (response.status >= 400) {
      addLog({
        type: "network",
        level: response.status >= 500 ? "error" : "warn",
        message: `${request.method} ${request.url} failed`,
        timestamp: new Date().toISOString(),
        url: request.url,
        status: response.status,
      });
    }
  });
}