// Polyfill fetch for Node.js test environment
if (typeof globalThis.fetch === 'undefined') {
  const { fetch, Request, Response, Headers } = require('undici');
  globalThis.fetch = fetch;
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
}

// Mock Next.js router (only for frontend tests)
if (typeof window !== 'undefined') {
  jest.mock('next/navigation', () => ({
    useRouter() {
      return {
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
        asPath: '/',
      };
    },
    usePathname() {
      return '/';
    },
    useSearchParams() {
      return new URLSearchParams();
    },
  }));
}

// Load environment variables from .env.local
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = '/api/v1';
process.env.NODE_ENV = 'test';
process.env.DISABLE_EMAIL_VERIFICATION = 'true';

