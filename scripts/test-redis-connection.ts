/**
 * Test Redis Connection
 * Quick script to verify Redis is configured correctly
 */

import { Redis } from 'ioredis';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL not set in .env.local');
  console.error('   Run: ./scripts/setup-redis.sh');
  process.exit(1);
}

console.log('Testing Redis connection...');
console.log(`URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  process.exit(1);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

// Test ping
redis
  .ping()
  .then(() => {
    console.log('✅ Redis ping successful');
    return redis.set('test-key', 'test-value');
  })
  .then(() => {
    console.log('✅ Redis write test passed');
    return redis.get('test-key');
  })
  .then((value) => {
    if (value === 'test-value') {
      console.log('✅ Redis read test passed');
      return redis.del('test-key');
    } else {
      throw new Error('Read test failed: value mismatch');
    }
  })
  .then(() => {
    console.log('');
    console.log('✅ All Redis tests passed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start worker: npm run worker');
    console.log('2. Run tests: npm run test:jobs');
    redis.quit();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Redis test error:', err.message);
    redis.quit();
    process.exit(1);
  });

