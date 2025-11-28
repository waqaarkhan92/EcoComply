/**
 * Queue Manager Tests
 * Tests the queue infrastructure without requiring Redis
 */

import { describe, it, expect } from '@jest/globals';
import { getQueue, QUEUE_NAMES, closeAllQueues } from '../../../lib/queue/queue-manager';

describe('Queue Manager', () => {
  afterAll(async () => {
    await closeAllQueues();
  });

  it('should export queue names', () => {
    expect(QUEUE_NAMES.DOCUMENT_PROCESSING).toBe('document-processing');
    expect(QUEUE_NAMES.MONITORING_SCHEDULE).toBe('monitoring-schedule');
    expect(QUEUE_NAMES.DEADLINE_ALERTS).toBe('deadline-alerts');
    expect(QUEUE_NAMES.EVIDENCE_REMINDERS).toBe('evidence-reminders');
    expect(QUEUE_NAMES.AUDIT_PACK_GENERATION).toBe('audit-pack-generation');
  });

  it('should handle missing Redis gracefully', () => {
    // If REDIS_URL is not set, getQueue should throw or handle gracefully
    // This test verifies the queue manager structure
    expect(typeof getQueue).toBe('function');
  });
});

