/**
 * Health Check API Tests
 * 
 * Note: These tests require the Next.js server to be running.
 * Run: npm run dev (in separate terminal) before running tests.
 */

import { TestClient } from '../../helpers/test-client';

describe('Health Check API', () => {
  const client = new TestClient();

  it('should return healthy status', async () => {
    const response = await client.get('/api/v1/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    // Health endpoint returns { data: { status: "healthy", ... }, meta: {...} }
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.data.status);
  });
});

