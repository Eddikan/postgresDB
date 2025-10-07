# Logger Utility

A reusable Winston-based logger for the Primefrontier backend application.

## Features

- **Colorized Console Output**: Easy-to-read colored logs in development
- **Timestamp Support**: ISO timestamps on all log entries
- **Multiple Log Levels**: info, warn, error, debug, verbose
- **Error Stack Traces**: Automatic stack trace logging for Error objects
- **Production File Logging**: Separate error and combined log files in production
- **Child Loggers**: Create loggers with default metadata
- **TypeScript Support**: Full type safety and IntelliSense

## Usage

### Basic Logging

```typescript
import { Logger } from '../utils/Logger';

// Info logging
Logger.info('Application started successfully');

// Warning logging  
Logger.warn('Database connection is slow');

// Error logging
Logger.error('Failed to connect to database');

// Debug logging (only in development)
Logger.debug('Processing user request');
```

### Logging with Metadata

```typescript
// Add contextual information
Logger.info('User login successful', {
  userId: '123',
  email: 'user@example.com',
  timestamp: new Date()
});

Logger.error('Payment processing failed', {
  orderId: 'order-456',
  amount: 99.99,
  currency: 'USD'
});
```

### Error Logging with Stack Traces

```typescript
try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  // Automatically includes stack trace
  Logger.error('Operation failed', error);
}

// Or with custom error
const customError = new Error('Custom error message');
Logger.error('Custom operation failed', customError);
```

### Child Loggers

Create child loggers with default metadata that gets included in every log:

```typescript
// Create a child logger for a specific module
const userServiceLogger = Logger.child({
  module: 'UserService',
  version: '1.2.0'
});

// All logs from this child logger will include the default metadata
userServiceLogger.info('Processing user registration'); 
// Output: [timestamp] [info]: Processing user registration {"module":"UserService","version":"1.2.0"}

userServiceLogger.error('User validation failed', { userId: '123' });
// Output: [timestamp] [error]: User validation failed {"module":"UserService","version":"1.2.0","userId":"123"}
```

## Configuration

### Log Levels

The logger respects the `LOG_LEVEL` environment variable:

```bash
# Set log level (default: 'info')
LOG_LEVEL=debug npm run dev
LOG_LEVEL=warn npm run start
```

Available levels (in order of priority):
- `error` - Only errors
- `warn` - Warnings and errors  
- `info` - Info, warnings, and errors (default)
- `debug` - All logs including debug (development only)
- `verbose` - Most detailed logging

### Production Logging

In production (`NODE_ENV=production`), the logger automatically:
- Writes error logs to `logs/error.log`
- Writes all logs to `logs/combined.log` 
- Uses JSON format for structured logging
- Reduces console output verbosity

## Integration with Fastify

Replace console.log statements throughout your Fastify application:

```typescript
// Instead of:
console.log('Server started on port 3000');
console.error('Database connection failed:', error);

// Use:
Logger.info('Server started on port 3000');
Logger.error('Database connection failed', error);
```

## Advanced Usage

### Direct Winston Access

If you need access to the underlying Winston instance:

```typescript
const winstonInstance = Logger.getWinstonInstance();
// Use Winston directly for advanced features
```

### Custom Formatters

The logger uses a custom formatter that provides readable output:

```
2023-10-07 15:30:45 [info]: Application started successfully
2023-10-07 15:30:46 [warn]: Database connection is slow {"retryCount":3}
2023-10-07 15:30:47 [error]: Operation failed
Error: Something went wrong
    at processOperation (/app/src/service.ts:42:15)
    at async UserService.createUser (/app/src/userService.ts:28:7)
```

## Best Practices

1. **Use appropriate log levels**: 
   - `error` for exceptions and failures
   - `warn` for concerning but non-breaking issues
   - `info` for general application flow
   - `debug` for detailed debugging information

2. **Include relevant context**:
   ```typescript
   // Good
   Logger.info('User created successfully', { userId, email, role });
   
   // Less helpful  
   Logger.info('User created');
   ```

3. **Use child loggers for modules**:
   ```typescript
   // In UserService.ts
   const logger = Logger.child({ module: 'UserService' });
   
   // In PaymentService.ts  
   const logger = Logger.child({ module: 'PaymentService' });
   ```

4. **Don't log sensitive data**:
   ```typescript
   // Bad
   Logger.info('User login', { password: user.password });
   
   // Good
   Logger.info('User login', { userId: user.id, email: user.email });
   ```

## File Structure

```
src/
  utils/
    Logger.ts          # Main logger class
    logger-example.ts  # Usage examples
logs/                  # Production log files (auto-created)
  error.log           # Error-level logs only
  combined.log        # All logs
```