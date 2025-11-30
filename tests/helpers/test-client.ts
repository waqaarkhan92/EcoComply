/**
 * Test Client Helper
 * Provides utilities for API testing
 */

import { NextRequest } from 'next/server';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token?: string;
  company_id?: string;
}

export class TestClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(
    method: string,
    path: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      token?: string;
    } = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body) {
      if (options.body instanceof FormData) {
        delete headers['Content-Type']; // Let browser set multipart boundary
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(url, fetchOptions);
      
      // If we get HTML instead of JSON, it's likely a Next.js error page
      // This shouldn't happen for API routes, but we'll handle it gracefully
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') && response.status >= 400) {
        console.warn(`Received HTML response for ${method} ${path} (status: ${response.status}). This may indicate a route error.`);
      }
      
      return response;
    } catch (error) {
      // If fetch fails completely, create a mock error response
      console.error(`Request failed for ${method} ${path}:`, error);
      return new Response(
        JSON.stringify({
          error: {
            code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network request failed',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  async get(path: string, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('GET', path, options);
  }

  async post(path: string, body?: any, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('POST', path, { body, ...options });
  }

  async put(path: string, body?: any, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('PUT', path, { body, ...options });
  }

  async delete(path: string, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('DELETE', path, options);
  }

  async signup(email: string, password: string, companyName?: string, fullName?: string): Promise<TestUser> {
    // Add delay to avoid Supabase rate limiting (increased for reliability)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await this.post('/api/v1/auth/signup', {
      email,
      password,
      full_name: fullName || `Test User ${Date.now()}`,
      company_name: companyName || `Test Company ${Date.now()}`,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Signup failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const userId = data.data.user.id;
    const companyId = data.data.user.company_id;

    // Signup may return tokens if email verification is disabled
    // Otherwise, login to get token
    let token: string | undefined = data.data.access_token;
    
    if (!token) {
      // Try explicit login with multiple retries and progressive delays
      const maxRetries = 3;
      const delays = [2000, 3000, 5000]; // Progressive delays
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          token = await this.login(email, password);
          if (token) {
            break; // Success, exit retry loop
          }
        } catch (error) {
          if (attempt === maxRetries - 1) {
            // Last attempt failed
            console.warn(`Login after signup failed after ${maxRetries} attempts:`, error);
          }
        }
      }
    }

    return {
      id: userId,
      email,
      password,
      token,
      company_id: companyId,
    };
  }

  async login(email: string, password: string): Promise<string> {
    const response = await this.post('/api/v1/auth/login', {
      email,
      password,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    // Login returns: { data: { access_token, refresh_token, user } }
    return data.data?.access_token || data.data?.token?.access_token || '';
  }
}

