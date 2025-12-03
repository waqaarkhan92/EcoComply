'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post<{
        access_token: string;
        refresh_token: string;
        user: any;
      }>('/auth/login', {
        email,
        password,
      });

      // Set tokens FIRST so API client can use them for subsequent requests
      const { setTokens } = useAuthStore.getState();
      setTokens({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
      });

      // Now fetch user and company details (tokens are set, so API calls will work)
      let userData = response.data.user;
      let companyData: {
        id: string;
        name: string;
        subscription_tier: 'core' | 'growth' | 'consultant';
      } = {
        id: response.data.user.company_id,
        name: '',
        subscription_tier: 'core',
      };

      try {
        // Get company details
        const companyResponse = await apiClient.get<{
          id: string;
          name: string;
          subscription_tier: 'core' | 'growth' | 'consultant';
        }>(`/companies/${response.data.user.company_id}`);

        companyData = companyResponse.data;
      } catch (companyError) {
        console.warn('Failed to fetch company details:', companyError);
        // Continue with default company data
      }

      // Login to store with all data
      login(
        {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          company_id: userData.company_id,
          email_verified: userData.email_verified,
        },
        companyData,
        userData.roles || [], // Roles from login response
        {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
        }
      );

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-base p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">EcoComply</h1>
        <p className="text-text-secondary mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="md"
            className="w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary hover:text-primary-dark font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

