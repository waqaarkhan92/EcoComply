/**
 * Recurring Task Generation Job Tests
 */

import { generateRecurringTasks } from '@/lib/jobs/recurring-task-generation-job';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Recurring Task Generation Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate tasks from schedules', async () => {
    // Mock schedule data
    const mockSchedule = {
      id: 'schedule-1',
      company_id: 'company-1',
      site_id: 'site-1',
      schedule_type: 'MONITORING',
      schedule_name: 'Monthly Monitoring',
      description: 'Monthly monitoring task',
      next_due_date: new Date().toISOString().split('T')[0],
      is_active: true,
      recurrence_pattern: { interval: 'MONTHLY', interval_value: 1 },
      obligation_id: null,
    };

    jest.spyOn(supabaseAdmin.from('schedules'), 'select').mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [mockSchedule],
        error: null,
      }),
    } as any);

    const result = await generateRecurringTasks();

    expect(result.success).toBe(true);
    expect(result.tasksCreated).toBeGreaterThan(0);
  });

  it('should handle event-based triggers', async () => {
    const mockTriggerRule = {
      id: 'rule-1',
      company_id: 'company-1',
      site_id: 'site-1',
      schedule_id: 'schedule-1',
      rule_type: 'EVENT_BASED',
      rule_config: { offset_months: 6 },
      event_id: 'event-1',
      is_active: true,
      schedules: {
        id: 'schedule-1',
        schedule_type: 'MONITORING',
        schedule_name: 'Post-Commissioning Check',
      },
      recurrence_events: {
        id: 'event-1',
        event_name: 'Generator Commissioning',
        event_date: '2024-01-01',
      },
    };

    jest.spyOn(supabaseAdmin.from('recurrence_trigger_rules'), 'select').mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [mockTriggerRule],
        error: null,
      }),
    } as any);

    const result = await generateRecurringTasks();

    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    jest.spyOn(supabaseAdmin.from('schedules'), 'select').mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    } as any);

    const result = await generateRecurringTasks();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

