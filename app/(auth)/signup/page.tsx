'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[FRONTEND] Form submitted');
    setError('');

    // Validation
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    console.log('[FRONTEND] Validation passed, submitting...');
    setLoading(true);

    try {
      console.log('[FRONTEND] Calling API /auth/signup...');
      const response = await apiClient.post<{
        access_token?: string;
        refresh_token?: string;
        user: any;
      }>('/auth/signup', {
        company_name: formData.company_name,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });
      console.log('[FRONTEND] API response received:', response);

      // If signup returns tokens, login immediately
      if (response.data.access_token && response.data.refresh_token) {
        // Set tokens FIRST so API client can use them for subsequent requests
        const { setTokens } = useAuthStore.getState();
        setTokens({
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
        });

        // Now fetch company details (tokens are set, so API call will work)
        let companyData = {
          id: response.data.user.company_id,
          name: '', // Will fetch below
          subscription_tier: 'core' as const,
        };

        try {
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

        // Now call login with all the data
        login(
          response.data.user,
          companyData,
          [], // Roles will be fetched separately if needed
          {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
          }
        );

        // Mark SIGNUP step as complete
        try {
          await apiClient.put('/users/me/onboarding-progress', {
            flow_type: 'FIRST_TIME',
            step: 'SIGNUP',
            completed: true,
          });
        } catch (onboardingError) {
          console.warn('Failed to update onboarding progress:', onboardingError);
        }

        // Redirect to onboarding (site setup) instead of dashboard
        router.push('/onboarding/site-setup');
      } else {
        // Email verification required - but in dev/test mode, this shouldn't happen
        // If we get here, still try to redirect to dashboard (user was created)
        console.warn('Signup completed but no tokens returned. Redirecting to dashboard anyway.');
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      // Try to extract error message from API response
      let errorMessage = 'Signup failed. Please try again.';
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.data?.error?.code === 'VALIDATION_ERROR') {
        errorMessage = err.response.data.error.message || 'Validation error. Please check your input.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-base p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Create Account</h1>
        <p className="text-text-secondary mb-8">Get started with Oblicore</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-text-primary mb-2">
              Company Name
            </label>
            <Input
              id="company_name"
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
              placeholder="Enter your company name"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-text-primary mb-2">
              Full Name
            </label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              placeholder="Create a password"
            />
            <p className="mt-1 text-xs text-text-secondary">Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-text-primary mb-2">
              Confirm Password
            </label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              required
              placeholder="Confirm your password"
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
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-dark font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

