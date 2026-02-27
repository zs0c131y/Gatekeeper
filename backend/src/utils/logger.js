/**
 * Structured Winston logger.
 *
 * Log levels: error, warn, info, http, debug
 * - Console transport with colorized output in development
 * - JSON format for production
 */

const { createLogger, format, transports } = require("winston");

const isDev = process.env.NODE_ENV !== "production";

const logger = createLogger({
  level: isDev ? "debug" : "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.errors({ stack: true }),
    isDev
      ? format.combine(
          format.colorize(),
          format.printf(({ timestamp, level, message, stack, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? " " + JSON.stringify(meta)
              : "";
            return `${timestamp} ${level}: ${stack || message}${metaStr}`;
          }),
        )
      : format.json(),
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

module.exports = logger;
