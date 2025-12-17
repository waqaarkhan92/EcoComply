/**
 * Structured Logger
 * Uses pino for high-performance, structured logging
 *
 * Benefits:
 * - Queryable JSON logs
 * - Performance: 5x faster than console.log
 * - Automatic serialization
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - Request correlation via request IDs
 */

import pino from 'pino';

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create base logger with production-optimized settings
export const logger = pino({
  level: logLevel,

  // Production: JSON output for log aggregation
  // Development: Pretty-print for readability
  ...(process.env.NODE_ENV === 'production'
    ? {
        // Production config
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        // Redact sensitive fields
        redact: {
          paths: [
            'password',
            'apiKey',
            'api_key',
            'authorization',
            'cookie',
            'access_token',
            'refresh_token',
            '*.password',
            '*.apiKey',
            '*.api_key',
          ],
          remove: true,
        },
      }
    : {
        // Development config - pretty print
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }),

  // Base fields added to every log
  base: {
    env: process.env.NODE_ENV,
    service: 'ecocomply',
  },
});

/**
 * Create child logger with context
 * Use this to add request-specific context (e.g., request ID, user ID)
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log HTTP request
 */
export function logRequest(req: any, context?: Record<string, any>) {
  const requestLogger = context ? logger.child(context) : logger;

  requestLogger.info({
    type: 'http_request',
    method: req.method,
    url: req.url,
    headers: {
      userAgent: req.headers?.get?.('user-agent') || req.headers?.['user-agent'],
      referer: req.headers?.get?.('referer') || req.headers?.['referer'],
    },
    requestId: req.headers?.get?.('x-request-id') || req.headers?.['x-request-id'],
  }, 'HTTP request received');
}

/**
 * Log HTTP response
 */
export function logResponse(
  req: any,
  res: any,
  durationMs: number,
  context?: Record<string, any>
) {
  const responseLogger = context ? logger.child(context) : logger;

  responseLogger.info({
    type: 'http_response',
    method: req.method,
    url: req.url,
    statusCode: res.status,
    durationMs,
    requestId: req.headers?.get?.('x-request-id') || req.headers?.['x-request-id'],
  }, `HTTP response sent (${durationMs}ms)`);
}

/**
 * Log database query
 */
export function logDatabaseQuery(
  operation: string,
  table: string,
  durationMs: number,
  context?: Record<string, any>
) {
  const dbLogger = context ? logger.child(context) : logger;

  dbLogger.debug({
    type: 'database_query',
    operation,
    table,
    durationMs,
  }, `Database query: ${operation} on ${table} (${durationMs}ms)`);
}

/**
 * Log AI/LLM operation
 */
export function logAIOperation(
  model: string,
  operation: string,
  tokens: { input: number; output: number; total: number },
  cost: number,
  durationMs: number,
  context?: Record<string, any>
) {
  const aiLogger = context ? logger.child(context) : logger;

  aiLogger.info({
    type: 'ai_operation',
    model,
    operation,
    tokens,
    cost,
    durationMs,
  }, `AI operation: ${operation} using ${model} (${tokens.total} tokens, $${cost.toFixed(4)}, ${durationMs}ms)`);
}

/**
 * Log document processing event
 */
export function logDocumentProcessing(
  documentId: string,
  stage: 'started' | 'extraction' | 'obligation_creation' | 'completed' | 'failed',
  metadata: Record<string, any>,
  context?: Record<string, any>
) {
  const docLogger = context ? logger.child(context) : logger;

  const level = stage === 'failed' ? 'error' : 'info';

  docLogger[level]({
    type: 'document_processing',
    documentId,
    stage,
    ...metadata,
  }, `Document processing: ${stage} (${documentId})`);
}

/**
 * Log background job event
 */
export function logBackgroundJob(
  jobId: string,
  jobType: string,
  status: 'started' | 'completed' | 'failed' | 'retry',
  metadata: Record<string, any>,
  context?: Record<string, any>
) {
  const jobLogger = context ? logger.child(context) : logger;

  const level = status === 'failed' ? 'error' : 'info';

  jobLogger[level]({
    type: 'background_job',
    jobId,
    jobType,
    status,
    ...metadata,
  }, `Background job: ${jobType} ${status} (${jobId})`);
}

/**
 * Log error with stack trace and context
 */
export function logError(
  error: Error,
  context?: Record<string, any>,
  additionalInfo?: Record<string, any>
) {
  const errorLogger = context ? logger.child(context) : logger;

  errorLogger.error({
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...additionalInfo,
  }, `Error: ${error.message}`);
}

/**
 * Performance timer utility
 * Usage:
 *   const timer = startTimer();
 *   // ... do work ...
 *   const duration = timer.end();
 */
export function startTimer() {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
  };
}

/**
 * Example usage:
 *
 * // Basic logging
 * logger.info('Server started');
 * logger.debug({ userId: '123' }, 'User authenticated');
 * logger.error({ error }, 'Failed to process document');
 *
 * // Request-scoped logging
 * const requestLogger = createChildLogger({ requestId: 'req-123' });
 * requestLogger.info('Processing request');
 *
 * // HTTP request logging
 * logRequest(request, { userId: session.userId });
 * logResponse(request, response, 150);
 *
 * // AI operation logging
 * logAIOperation('gpt-4o-mini', 'extract_obligations',
 *   { input: 8000, output: 1500, total: 9500 },
 *   0.0142, 3500
 * );
 *
 * // Document processing
 * logDocumentProcessing('doc-123', 'extraction', {
 *   pageCount: 45,
 *   obligations: 23
 * });
 *
 * // Error logging
 * try {
 *   await processDocument();
 * } catch (error) {
 *   logError(error, { documentId: 'doc-123' }, { stage: 'extraction' });
 * }
 */

// Export types for convenience
export type Logger = typeof logger;
export type ChildLogger = ReturnType<typeof createChildLogger>;
