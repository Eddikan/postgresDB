// Example usage of the Logger utility class

import { Logger } from './Logger';

// Basic logging
Logger.info('Application started successfully');
Logger.warn('This is a warning message');
Logger.error('This is an error message');

// Logging with metadata
Logger.info('User logged in', { userId: '123', email: 'user@example.com' });

// Logging errors with stack traces
const error = new Error('Something went wrong');
Logger.error('An error occurred', error);

// Debug logging (only shows in development)
Logger.debug('Debug information', { requestId: 'req-123' });

// Using child loggers with default metadata
const userLogger = Logger.child({ userId: '123', module: 'UserService' });
// This will include userId and module in every log from this child logger

export {}; // Make this a module