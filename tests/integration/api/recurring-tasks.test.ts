/**
 * Recurring Tasks API Integration Tests
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/recurring-tasks/route';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Recurring Tasks API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/recurring-tasks', () => {
    it('should return list of recurring tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          task_title: 'Test Task',
          task_type: 'MONITORING',
          status: 'PENDING',
          due_date: '2025-02-15',
          created_at: new Date().toISOString(),
        },
      ];

      jest.spyOn(supabaseAdmin.from('recurring_tasks'), 'select').mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockTasks,
          error: null,
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/v1/recurring-tasks');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
    });
  });

  describe('POST /api/v1/recurring-tasks', () => {
    it('should create a new recurring task', async () => {
      const mockTask = {
        id: 'task-1',
        task_title: 'New Task',
        task_type: 'MONITORING',
        site_id: 'site-1',
        due_date: '2025-02-15',
        trigger_type: 'MANUAL',
      };

      jest.spyOn(supabaseAdmin.from('sites'), 'select').mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'site-1', company_id: 'company-1' },
          error: null,
        }),
      } as any);

      jest.spyOn(supabaseAdmin.from('recurring_tasks'), 'insert').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTask,
          error: null,
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/v1/recurring-tasks', {
        method: 'POST',
        body: JSON.stringify({
          site_id: 'site-1',
          task_type: 'MONITORING',
          task_title: 'New Task',
          due_date: '2025-02-15',
          trigger_type: 'MANUAL',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toBeDefined();
    });
  });
});

