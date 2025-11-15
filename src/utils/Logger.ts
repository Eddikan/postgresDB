import winston from 'winston';
import fs from 'fs';

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
      const transports: winston.transport[] = [
        // Always log to console (CloudWatch in Lambda)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          ),
        }),
      ];

      // Only add file transports if not in Lambda (when writable filesystem available)
      const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
      if (!isLambda) {
        const logDir = 'logs';
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        transports.push(
          new winston.transports.File({ 
            filename: `${logDir}/error.log`, 
            level: 'error' 
          }),
          new winston.transports.File({ 
            filename: `${logDir}/combined.log` 
          })
        );
      }

      Logger.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json()
        ),
        defaultMeta: { service: 'primefrontier-backend' },
        transports,
      });
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