import winston from 'winston';

/**
 * Reusable Logger utility class using Winston
 * Provides colorized console output with timestamps and log levels
 */
export class Logger {
  private static instance: winston.Logger;

  /**
   * Initialize Winston logger with colorized console transport
   */
  private static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          winston.format.errors({ stack: true }),
          winston.format.colorize({ all: true }),
          winston.format.printf((info) => {
            const { timestamp, level, message, stack } = info;
            if (stack) {
              return `${timestamp} [${level}]: ${message}\n${stack}`;
            }
            return `${timestamp} [${level}]: ${message}`;
          })
        ),
        transports: [
          new winston.transports.Console({
            handleExceptions: true,
            handleRejections: true
          })
        ],
        exitOnError: false
      });

      // Add file logging in production
      if (process.env.NODE_ENV === 'production') {
        Logger.instance.add(new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        }));

        Logger.instance.add(new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        }));
      }
    }
    return Logger.instance;
  }

  /**
   * Log an info message
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static info(message: string, meta?: any): void {
    Logger.getInstance().info(message, meta);
  }

  /**
   * Log a warning message
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static warn(message: string, meta?: any): void {
    Logger.getInstance().warn(message, meta);
  }

  /**
   * Log an error message
   * @param message - The message to log
   * @param error - Optional error object or metadata
   */
  static error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      Logger.getInstance().error(message, { 
        error: error.message, 
        stack: error.stack,
        name: error.name
      });
    } else {
      Logger.getInstance().error(message, error);
    }
  }

  /**
   * Log a debug message (only in development)
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static debug(message: string, meta?: any): void {
    Logger.getInstance().debug(message, meta);
  }

  /**
   * Log a verbose message
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static verbose(message: string, meta?: any): void {
    Logger.getInstance().verbose(message, meta);
  }

  /**
   * Create a child logger with default metadata
   * @param defaultMeta - Default metadata to include in all logs
   * @returns Winston child logger instance
   */
  static child(defaultMeta: any): winston.Logger {
    return Logger.getInstance().child(defaultMeta);
  }

  /**
   * Get the underlying Winston logger instance
   * @returns Winston logger instance
   */
  static getWinstonInstance(): winston.Logger {
    return Logger.getInstance();
  }
}

// Export the class as default as well
export default Logger;