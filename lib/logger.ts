type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function getConfiguredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL ?? "info";
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function formatMessage(
  level: LogLevel,
  namespace: string,
  message: string,
  meta?: unknown,
): string {
  const ts = new Date().toISOString();
  const color = LEVEL_COLORS[level];
  const levelTag = `${color}${BOLD}[${level.toUpperCase().padEnd(5)}]${RESET}`;
  const ns = namespace ? `${DIM}(${namespace})${RESET} ` : "";
  const metaStr =
    meta !== undefined
      ? `\n${DIM}${JSON.stringify(meta, null, 2)}${RESET}`
      : "";

  return `${DIM}${ts}${RESET} ${levelTag} ${ns}${message}${metaStr}`;
}

function shouldLog(level: LogLevel): boolean {
  const configured = getConfiguredLevel();
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configured];
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  child(namespace: string): Logger;
}

function createLogger(namespace = ""): Logger {
  return {
    debug(message: string, meta?: unknown) {
      if (!shouldLog("debug")) return;
      console.debug(formatMessage("debug", namespace, message, meta));
    },
    info(message: string, meta?: unknown) {
      if (!shouldLog("info")) return;
      console.info(formatMessage("info", namespace, message, meta));
    },
    warn(message: string, meta?: unknown) {
      if (!shouldLog("warn")) return;
      console.warn(formatMessage("warn", namespace, message, meta));
    },
    error(message: string, meta?: unknown) {
      if (!shouldLog("error")) return;
      console.error(formatMessage("error", namespace, message, meta));
    },
    child(ns: string) {
      const childNs = namespace ? `${namespace}:${ns}` : ns;
      return createLogger(childNs);
    },
  };
}

export const logger = createLogger();
