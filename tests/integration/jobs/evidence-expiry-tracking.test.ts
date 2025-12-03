/**
 * Evidence Expiry Tracking Job Tests
 */

import { updateEvidenceExpiryTracking } from '@/lib/jobs/evidence-expiry-tracking-job';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Evidence Expiry Tracking Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update expiry tracking for evidence items', async () => {
    const mockEvidence = {
      id: 'evidence-1',
      company_id: 'company-1',
      site_id: 'site-1',
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    };

    jest.spyOn(supabaseAdmin.from('evidence_items'), 'select').mockReturnValue({
      not: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [mockEvidence],
        error: null,
      }),
    } as any);

    jest.spyOn(supabaseAdmin.from('evidence_expiry_tracking'), 'select').mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      }),
    } as any);

    jest.spyOn(supabaseAdmin.from('evidence_expiry_tracking'), 'insert').mockResolvedValue({
      data: { id: 'tracking-1' },
      error: null,
    } as any);

    const result = await updateEvidenceExpiryTracking();

    expect(result.success).toBe(true);
    expect(result.itemsProcessed).toBeGreaterThan(0);
  });

  it('should send reminders for expiring evidence', async () => {
    const mockEvidence = {
      id: 'evidence-1',
      company_id: 'company-1',
      site_id: 'site-1',
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    };

    jest.spyOn(supabaseAdmin.from('evidence_items'), 'select').mockReturnValue({
      not: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [mockEvidence],
        error: null,
      }),
    } as any);

    jest.spyOn(supabaseAdmin.from('evidence_expiry_tracking'), 'select').mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'tracking-1',
          reminder_days: [90, 30, 7],
          reminders_sent: [],
        },
        error: null,
      }),
    } as any);

    jest.spyOn(supabaseAdmin.from('evidence_expiry_tracking'), 'update').mockResolvedValue({
      data: { id: 'tracking-1' },
      error: null,
    } as any);

    const result = await updateEvidenceExpiryTracking();

    expect(result.success).toBe(true);
    expect(result.remindersSent).toBeGreaterThan(0);
  });

  it('should mark expired evidence', async () => {
    const mockEvidence = {
      id: 'evidence-1',
      company_id: 'company-1',
      site_id: 'site-1',
      expiry_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
    };

    jest.spyOn(supabaseAdmin.from('evidence_items'), 'select').mockReturnValue({
      not: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [mockEvidence],
        error: null,
      }),
    } as any);

    jest.spyOn(supabaseAdmin.from('evidence_expiry_tracking'), 'select').mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'tracking-1',
          is_expired: false,
        },
        error: null,
      }),
    } as any);

    jest.spyOn(supabaseAdmin.from('evidence_expiry_tracking'), 'update').mockResolvedValue({
      data: { id: 'tracking-1', is_expired: true },
      error: null,
    } as any);

    const result = await updateEvidenceExpiryTracking();

    expect(result.success).toBe(true);
  });
});

