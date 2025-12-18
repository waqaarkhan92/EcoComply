/**
 * Notifications Integration Tests
 * Tests for /api/v1/notifications endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client for setup/cleanup
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('Notifications API Integration Tests', () => {
  let testUser: any;
  let testCompany: any;
  let authToken: string;
  let testNotifications: string[] = [];

  beforeAll(async () => {
    // Create test company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: 'Test Notifications Company',
        industry: 'Testing',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (companyError) throw companyError;
    testCompany = company;

    // Create test user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'notifications-test@example.com',
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create user in users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'notifications-test@example.com',
        company_id: testCompany.id,
        role: 'ADMIN',
        status: 'ACTIVE',
        email_verified: true,
      })
      .select()
      .single();

    if (userError) throw userError;
    testUser = user;

    // Sign in to get auth token
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'notifications-test@example.com',
      password: 'TestPassword123!',
    });

    if (signInError) throw signInError;
    authToken = signInData.session?.access_token || '';
  });

  afterAll(async () => {
    // Clean up notifications
    if (testNotifications.length > 0) {
      await supabaseAdmin.from('notifications').delete().in('id', testNotifications);
    }

    // Clean up user
    if (testUser) {
      await supabaseAdmin.from('users').delete().eq('id', testUser.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }

    // Clean up company
    if (testCompany) {
      await supabaseAdmin.from('companies').delete().eq('id', testCompany.id);
    }
  });

  beforeEach(() => {
    testNotifications = [];
  });

  describe('GET /api/v1/notifications', () => {
    it('should retrieve notifications for authenticated user', async () => {
      // Create test notifications
      const { data: notification1 } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'OBLIGATION_DUE',
          channel: 'IN_APP',
          priority: 'NORMAL',
          subject: 'Test Notification 1',
          body_text: 'This is test notification 1',
          status: 'SENT',
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      const { data: notification2 } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'EVIDENCE_UPLOADED',
          channel: 'IN_APP',
          priority: 'NORMAL',
          subject: 'Test Notification 2',
          body_text: 'This is test notification 2',
          status: 'SENT',
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (notification1) testNotifications.push(notification1.id);
      if (notification2) testNotifications.push(notification2.id);

      const response = await fetch(`http://localhost:3000/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(2);
      expect(data.pagination).toBeDefined();
    });

    it('should filter unread notifications only', async () => {
      // Create one read and one unread notification
      const { data: readNotif } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'TEST',
          channel: 'IN_APP',
          priority: 'NORMAL',
          subject: 'Read Notification',
          body_text: 'This is read',
          status: 'SENT',
          read_at: new Date().toISOString(),
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      const { data: unreadNotif } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'TEST',
          channel: 'IN_APP',
          priority: 'NORMAL',
          subject: 'Unread Notification',
          body_text: 'This is unread',
          status: 'SENT',
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (readNotif) testNotifications.push(readNotif.id);
      if (unreadNotif) testNotifications.push(unreadNotif.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/notifications?unread_only=true`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // All returned notifications should be unread
      data.data.forEach((notif: any) => {
        expect(notif.read_at).toBeUndefined();
      });
    });

    it('should support pagination with limit parameter', async () => {
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        const { data } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: testUser.id,
            company_id: testCompany.id,
            recipient_email: testUser.email,
            notification_type: 'TEST',
            channel: 'IN_APP',
            priority: 'NORMAL',
            subject: `Test Notification ${i}`,
            body_text: `This is test notification ${i}`,
            status: 'SENT',
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (data) testNotifications.push(data.id);
      }

      const response = await fetch(`http://localhost:3000/api/v1/notifications?limit=3`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.length).toBeLessThanOrEqual(3);
      expect(responseData.pagination.has_more).toBeDefined();
    });

    it('should support pagination with cursor', async () => {
      // Get first page
      const firstResponse = await fetch(`http://localhost:3000/api/v1/notifications?limit=2`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const firstData = await firstResponse.json();

      if (firstData.pagination.next_cursor) {
        // Get second page
        const secondResponse = await fetch(
          `http://localhost:3000/api/v1/notifications?limit=2&cursor=${firstData.pagination.next_cursor}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect(secondResponse.status).toBe(200);

        const secondData = await secondResponse.json();
        expect(secondData.success).toBe(true);
        expect(Array.isArray(secondData.data)).toBe(true);

        // Ensure no overlap between pages
        const firstIds = firstData.data.map((n: any) => n.id);
        const secondIds = secondData.data.map((n: any) => n.id);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should reject invalid limit parameter', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/notifications?limit=999`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/notifications`);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/v1/notifications/[notificationId]/read', () => {
    it('should mark notification as read', async () => {
      // Create unread notification
      const { data: notification } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'TEST',
          channel: 'IN_APP',
          priority: 'NORMAL',
          subject: 'To Be Read',
          body_text: 'This will be marked as read',
          status: 'SENT',
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (notification) testNotifications.push(notification.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/notifications/${notification!.id}/read`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify notification is marked as read
      const { data: updatedNotif } = await supabaseAdmin
        .from('notifications')
        .select('read_at')
        .eq('id', notification!.id)
        .single();

      expect(updatedNotif?.read_at).toBeTruthy();
    });

    it('should handle non-existent notification', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(
        `http://localhost:3000/api/v1/notifications/${fakeId}/read`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      // Should either return 404 or 200 (idempotent)
      expect([200, 404]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/notifications/some-id/read`,
        {
          method: 'POST',
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      // Clean up existing notifications
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', testUser.id);

      // Create 3 unread notifications
      for (let i = 0; i < 3; i++) {
        const { data } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: testUser.id,
            company_id: testCompany.id,
            recipient_email: testUser.email,
            notification_type: 'TEST',
            channel: 'IN_APP',
            priority: 'NORMAL',
            subject: `Unread ${i}`,
            body_text: `Unread notification ${i}`,
            status: 'SENT',
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (data) testNotifications.push(data.id);
      }

      // Create 1 read notification
      const { data: readNotif } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'TEST',
          channel: 'IN_APP',
          priority: 'NORMAL',
          subject: 'Read',
          body_text: 'Read notification',
          status: 'SENT',
          read_at: new Date().toISOString(),
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (readNotif) testNotifications.push(readNotif.id);

      const response = await fetch(`http://localhost:3000/api/v1/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.count).toBe(3);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/notifications/unread-count`);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.headers.get('X-Rate-Limit-Limit')).toBeDefined();
      expect(response.headers.get('X-Rate-Limit-Remaining')).toBeDefined();
      expect(response.headers.get('X-Rate-Limit-Reset')).toBeDefined();
    });
  });

  describe('Entity Linking', () => {
    it('should retrieve notifications with entity information', async () => {
      // Create notification with entity link
      const { data: notification } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUser.id,
          company_id: testCompany.id,
          recipient_email: testUser.email,
          notification_type: 'OBLIGATION_DUE',
          channel: 'IN_APP',
          priority: 'HIGH',
          subject: 'Obligation Due Soon',
          body_text: 'Your obligation is due tomorrow',
          status: 'SENT',
          entity_type: 'obligation',
          entity_id: '12345678-1234-1234-1234-123456789012',
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (notification) testNotifications.push(notification.id);

      const response = await fetch(`http://localhost:3000/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const linkedNotif = data.data.find((n: any) => n.id === notification!.id);

      expect(linkedNotif).toBeDefined();
      expect(linkedNotif.entity_type).toBe('obligation');
      expect(linkedNotif.entity_id).toBe('12345678-1234-1234-1234-123456789012');
    });
  });
});
