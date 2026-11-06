import util from "node:util";
import winston, { format, transports } from "winston";
import { env, isProd, isTest } from "./env";

let globalLogger: winston.Logger | null = null;

const customFormat = format.printf(({ level, message, label, ms, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message} [${ms}]`;
});

function getGlobalLogger(): winston.Logger {
  if (globalLogger) return globalLogger;

  const transportList: winston.transport[] = [
    new transports.Console({
      format: isProd() ? format.json() : format.combine(format.colorize(), format.errors({ stack: true }), format.timestamp(), format.ms(), customFormat),
    }),
  ];

  if (isProd() && env.DD_API_KEY) {
    transportList.push(
      new transports.Http({
        host: "http-intake.logs.datadoghq.com",
        path: `/api/v2/logs?dd-api-key=${env.DD_API_KEY}&ddsource=nodejs&service=${env.SERVICE_NAME}`,
        ssl: true,
      }),
    );
  }

  globalLogger = winston.createLogger({
    exitOnError: false,
    transports: transportList,
    defaultMeta: { service: env.SERVICE_NAME },
    level: isProd() ? "info" : isTest() ? "warn" : "debug",
    silent: isTest() && !process.env.LOG_IN_TESTS,
  });
  return globalLogger;
}

// formats any extra arguments (objects are inspected) and logs with the given label
function makeLogFn(level: "info" | "error" | "debug" | "warn", label: string) {
  return (msg: unknown, ...args: unknown[]) => {
    const parts = [msg, ...args].map((a) => (typeof a === "string" ? a : util.inspect(a, { depth: 5 })));
    getGlobalLogger().log(level, parts.join(" "), { label });
  };
}

const logger = (name: string) => ({
  info: makeLogFn("info", name),
  warn: makeLogFn("warn", name),
  error: makeLogFn("error", name),
  debug: makeLogFn("debug", name),
});

export default logger;
