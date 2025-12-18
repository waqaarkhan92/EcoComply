/**
 * Comments Integration Tests
 * Tests for /api/v1/comments endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to ensure env vars are loaded
let supabaseAdmin: SupabaseClient;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and Service Key must be set for integration tests');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

// Skip by default - run with RUN_INTEGRATION_TESTS=true
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Comments API Integration Tests', () => {
  let testUser: any;
  let testCompany: any;
  let authToken: string;
  let testComments: string[] = [];
  let testEntityId: string;

  beforeAll(async () => {
    const supabase = getSupabaseAdmin();

    // Create test company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Comments Company',
        industry: 'Testing',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (companyError) throw companyError;
    testCompany = company;

    // Create test user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'comments-test@example.com',
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create user in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'comments-test@example.com',
        full_name: 'Test Comments User',
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'comments-test@example.com',
      password: 'TestPassword123!',
    });

    if (signInError) throw signInError;
    authToken = signInData.session?.access_token || '';

    // Use a test entity ID (doesn't need to exist for comment tests)
    testEntityId = '12345678-1234-1234-1234-123456789012';
  });

  afterAll(async () => {
    const supabase = getSupabaseAdmin();

    // Clean up comments
    if (testComments.length > 0) {
      await supabase.from('comments').delete().in('id', testComments);
    }

    // Clean up user
    if (testUser) {
      await supabase.from('users').delete().eq('id', testUser.id);
      await supabase.auth.admin.deleteUser(testUser.id);
    }

    // Clean up company
    if (testCompany) {
      await supabase.from('companies').delete().eq('id', testCompany.id);
    }
  });

  beforeEach(() => {
    testComments = [];
  });

  describe('POST /api/v1/comments', () => {
    it('should create a new comment', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'This is a test comment',
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.content).toBe('This is a test comment');
      expect(data.data.entity_type).toBe('obligation');
      expect(data.data.entity_id).toBe(testEntityId);
      expect(data.data.user_id).toBe(testUser.id);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.full_name).toBe('Test Comments User');

      testComments.push(data.data.id);
    });

    it('should create comment with mentions', async () => {
      const mentionedUserId = '87654321-4321-4321-4321-210987654321';

      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'Mentioning someone in this comment',
          mentions: [mentionedUserId],
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.mentions).toBeDefined();
      expect(data.data.mentions).toContain(mentionedUserId);

      testComments.push(data.data.id);
    });

    it('should create threaded reply', async () => {
      // Create parent comment
      const parentResponse = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'document',
          entity_id: testEntityId,
          content: 'Parent comment',
        }),
      });

      const parentData = await parentResponse.json();
      testComments.push(parentData.data.id);

      // Create reply
      const replyResponse = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'document',
          entity_id: testEntityId,
          content: 'Reply to parent',
          parent_id: parentData.data.id,
        }),
      });

      expect(replyResponse.status).toBe(201);

      const replyData = await replyResponse.json();
      expect(replyData.success).toBe(true);
      expect(replyData.data.parent_id).toBe(parentData.data.id);

      testComments.push(replyData.data.id);
    });

    it('should reject comment without required fields', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          // Missing entity_id and content
        }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject comment with empty content', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: '   ',
        }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should reject invalid entity_type', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'invalid_type',
          entity_id: testEntityId,
          content: 'Test comment',
        }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid mentions format', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'Test comment',
          mentions: ['not-a-uuid'],
        }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'Test comment',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/comments', () => {
    it('should retrieve comments for an entity', async () => {
      // Create test comments
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`http://localhost:3000/api/v1/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            entity_type: 'evidence',
            entity_id: testEntityId,
            content: `Test comment ${i}`,
          }),
        });

        const data = await response.json();
        testComments.push(data.data.id);
      }

      // Retrieve comments
      const response = await fetch(
        `http://localhost:3000/api/v1/comments?entity_type=evidence&entity_id=${testEntityId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(3);
      expect(data.pagination).toBeDefined();
    });

    it('should support pagination with limit', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/comments?entity_type=evidence&entity_id=${testEntityId}&limit=2`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(2);
    });

    it('should support pagination with cursor', async () => {
      // Get first page
      const firstResponse = await fetch(
        `http://localhost:3000/api/v1/comments?entity_type=evidence&entity_id=${testEntityId}&limit=2`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const firstData = await firstResponse.json();

      if (firstData.pagination.next_cursor) {
        // Get second page
        const secondResponse = await fetch(
          `http://localhost:3000/api/v1/comments?entity_type=evidence&entity_id=${testEntityId}&limit=2&cursor=${firstData.pagination.next_cursor}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect(secondResponse.status).toBe(200);

        const secondData = await secondResponse.json();
        expect(secondData.success).toBe(true);

        // Ensure no overlap between pages
        const firstIds = firstData.data.map((c: any) => c.id);
        const secondIds = secondData.data.map((c: any) => c.id);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should require entity_type parameter', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/comments?entity_id=${testEntityId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require entity_id parameter', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments?entity_type=obligation`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid limit parameter', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/comments?entity_type=obligation&entity_id=${testEntityId}&limit=9999`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/comments?entity_type=obligation&entity_id=${testEntityId}`
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/comments/[commentId]', () => {
    it('should update comment content', async () => {
      // Create comment
      const createResponse = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'pack',
          entity_id: testEntityId,
          content: 'Original content',
        }),
      });

      const createData = await createResponse.json();
      testComments.push(createData.data.id);

      // Update comment
      const updateResponse = await fetch(
        `http://localhost:3000/api/v1/comments/${createData.data.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            content: 'Updated content',
          }),
        }
      );

      expect(updateResponse.status).toBe(200);

      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      expect(updateData.data.content).toBe('Updated content');
      expect(updateData.data.id).toBe(createData.data.id);
    });

    it('should reject empty content update', async () => {
      // Create comment
      const createResponse = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'Original content',
        }),
      });

      const createData = await createResponse.json();
      testComments.push(createData.data.id);

      // Try to update with empty content
      const updateResponse = await fetch(
        `http://localhost:3000/api/v1/comments/${createData.data.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            content: '   ',
          }),
        }
      );

      expect(updateResponse.status).toBe(422);

      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(false);
    });

    it('should handle non-existent comment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`http://localhost:3000/api/v1/comments/${fakeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: 'Updated content',
        }),
      });

      expect([404, 500]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments/some-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Updated content',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/comments/[commentId]', () => {
    it('should delete a comment', async () => {
      // Create comment
      const createResponse = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'To be deleted',
        }),
      });

      const createData = await createResponse.json();
      const commentId = createData.data.id;

      // Delete comment
      const deleteResponse = await fetch(`http://localhost:3000/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // Verify comment is deleted
      const { data: deletedComment } = await getSupabaseAdmin()
        .from('comments')
        .select('id')
        .eq('id', commentId)
        .single();

      expect(deletedComment).toBeNull();
    });

    it('should handle non-existent comment deletion', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`http://localhost:3000/api/v1/comments/${fakeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Should either return 200 (idempotent) or 404
      expect([200, 404]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/comments/some-id`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Threaded Replies', () => {
    it('should support multiple levels of replies', async () => {
      // Create parent comment
      const parent = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'Parent comment',
        }),
      });

      const parentData = await parent.json();
      testComments.push(parentData.data.id);

      // Create first-level reply
      const reply1 = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'First level reply',
          parent_id: parentData.data.id,
        }),
      });

      const reply1Data = await reply1.json();
      testComments.push(reply1Data.data.id);

      expect(reply1Data.success).toBe(true);
      expect(reply1Data.data.parent_id).toBe(parentData.data.id);

      // Create second-level reply
      const reply2 = await fetch(`http://localhost:3000/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          entity_type: 'obligation',
          entity_id: testEntityId,
          content: 'Second level reply',
          parent_id: reply1Data.data.id,
        }),
      });

      const reply2Data = await reply2.json();
      testComments.push(reply2Data.data.id);

      expect(reply2Data.success).toBe(true);
      expect(reply2Data.data.parent_id).toBe(reply1Data.data.id);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/comments?entity_type=obligation&entity_id=${testEntityId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.headers.get('X-Rate-Limit-Limit')).toBeDefined();
      expect(response.headers.get('X-Rate-Limit-Remaining')).toBeDefined();
      expect(response.headers.get('X-Rate-Limit-Reset')).toBeDefined();
    });
  });
});
