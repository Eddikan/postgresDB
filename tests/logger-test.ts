#!/usr/bin/env node

/**
 * Logger Test Script
 * Run this to see the Logger in action: npm run test:logger
 */

import { Logger } from '../src/utils/Logger';

console.log('🚀 Testing Logger Utility...\n');

// Basic logging
Logger.info('✅ Logger initialized successfully');
Logger.warn('⚠️  This is a warning message');
Logger.error('❌ This is an error message');

// Logging with metadata
Logger.info('📊 User action logged', {
  userId: '123',
  action: 'login',
  timestamp: new Date(),
  ipAddress: '192.168.1.100'
});

// Error with stack trace
const testError = new Error('This is a test error with stack trace');
Logger.error('🔥 Error occurred during processing', testError);

// Debug logging (only shows if LOG_LEVEL=debug)
Logger.debug('🐛 Debug information', {
  requestId: 'req-abc-123',
  processingTime: '150ms'
});

// Child logger example
const moduleLogger = Logger.child({
  module: 'AuthService',
  version: '1.0.0'
});

moduleLogger.info('🔐 Authentication service started');
moduleLogger.warn('🚨 Rate limit approaching', { attempts: 8, limit: 10 });

console.log('\n✨ Logger test completed!');
console.log('💡 Try running with: LOG_LEVEL=debug node dist/tests/logger-test.js');