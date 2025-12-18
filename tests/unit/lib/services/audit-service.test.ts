/**
 * Audit Service Tests
 * Tests for audit logging functionality
 */

// Mock Supabase - must be before imports
const mockFrom = jest.fn(() => ({
  insert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
  select: jest.fn(() => ({
    eq: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

import { AuditService } from '@/lib/services/audit-service';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    jest.clearAllMocks();
  });

  describe('logCreate', () => {
    it('should log entity creation', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user123';
      const data = {
        obligation_title: 'Test Obligation',
        category: 'MONITORING',
      };

      await auditService.logCreate(entityType, entityId, userId, data);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should not throw error if logging fails', async () => {
      // Mock a failure
      (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn(() => {
          throw new Error('Database error');
        }),
      } as any);

      // Should not throw
      await expect(
        auditService.logCreate('obligation', 'id', 'user', {})
      ).resolves.not.toThrow();
    });
  });

  describe('logUpdate', () => {
    it('should log entity update with changes', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user123';
      const changes = {
        obligation_title: {
          old: 'Old Title',
          new: 'New Title',
        },
        status: {
          old: 'PENDING',
          new: 'COMPLETED',
        },
      };

      await auditService.logUpdate(entityType, entityId, userId, changes);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('logStatusChange', () => {
    it('should log status change', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user123';
      const oldStatus = 'PENDING';
      const newStatus = 'COMPLETED';

      await auditService.logStatusChange(entityType, entityId, userId, oldStatus, newStatus);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should include additional metadata', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user123';
      const oldStatus = 'PENDING';
      const newStatus = 'COMPLETED';
      const metadata = {
        completion_date: '2025-02-18',
        notes: 'Completed on time',
      };

      await auditService.logStatusChange(
        entityType,
        entityId,
        userId,
        oldStatus,
        newStatus,
        metadata
      );

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('logDelete', () => {
    it('should log entity deletion', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user123';
      const deletedData = {
        obligation_title: 'Deleted Obligation',
      };

      await auditService.logDelete(entityType, entityId, userId, deletedData);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs for entity', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';

      const mockLogs = [
        {
          id: 'log1',
          entity_type: 'obligation',
          entity_id: entityId,
          action: 'update',
          user_id: 'user123',
          changes: { status: { old: 'PENDING', new: 'COMPLETED' } },
          metadata: {},
          created_at: '2025-02-18T10:30:00Z',
          users: { full_name: 'John Doe', email: 'john@example.com' },
        },
      ];

      (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ data: mockLogs, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await auditService.getAuditLogs(entityType, entityId);

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('update');
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination', async () => {
      const entityType = 'obligation';
      const entityId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock with lt method for cursor-based pagination
      // Chain: from().select().eq().eq().order().lt().limit()
      (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                lt: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await auditService.getAuditLogs(entityType, entityId, {
        limit: 10,
        cursor: '2025-02-18T10:30:00Z:log1',
      });

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('getUserActivity', () => {
    it('should retrieve user activity', async () => {
      const userId = 'user123';

      const mockLogs = [
        {
          id: 'log1',
          entity_type: 'obligation',
          entity_id: 'ent1',
          action: 'update',
          user_id: userId,
          changes: {},
          metadata: {},
          created_at: '2025-02-18T10:30:00Z',
          users: { full_name: 'John Doe', email: 'john@example.com' },
        },
      ];

      (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: mockLogs, error: null })),
            })),
          })),
        })),
      } as any);

      const result = await auditService.getUserActivity(userId);

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].user_id).toBe(userId);
    });
  });

  describe('getBulkAuditLogs', () => {
    it('should retrieve logs for multiple entities', async () => {
      const entityType = 'obligation';
      const entityIds = ['id1', 'id2', 'id3'];

      const mockLogs = [
        {
          id: 'log1',
          entity_type: 'obligation',
          entity_id: 'id1',
          action: 'update',
          user_id: 'user123',
          changes: {},
          metadata: {},
          created_at: '2025-02-18T10:30:00Z',
          users: { full_name: 'John Doe', email: 'john@example.com' },
        },
      ];

      (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ data: mockLogs, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await auditService.getBulkAuditLogs(entityType, entityIds);

      expect(result.logs).toHaveLength(1);
    });
  });
});
