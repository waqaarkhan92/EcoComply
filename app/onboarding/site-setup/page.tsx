'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Building2 } from 'lucide-react';

export default function SiteSetupPage() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [formData, setFormData] = useState({
    site_name: '',
    regulator: '',
    water_company: '',
  });
  const [error, setError] = useState('');

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: async (siteData: any) => {
      const response = await apiClient.post('/sites', siteData);
      return response.data as { id: string };
    },
    onSuccess: async (data: { id: string }) => {
      // Mark SITE_CREATION step as complete
      try {
        await apiClient.put('/users/me/onboarding-progress', {
          flow_type: 'FIRST_TIME',
          step: 'SITE_CREATION',
          completed: true,
          data: { site_id: data.id },
        });
      } catch (onboardingError) {
        console.warn('Failed to update onboarding progress:', onboardingError);
      }

      // Redirect to upload method selection
      router.push('/onboarding/upload-method');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.site_name.trim()) {
      setError('Site name is required');
      return;
    }

    if (!company?.id) {
      setError('Company not found. Please try logging in again.');
      return;
    }

    createSiteMutation.mutate({
      name: formData.site_name,
      company_id: company.id,
      regulator: formData.regulator || null,
      water_company: formData.water_company || null,
    });
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Step 2 of 6</span>
            <span className="text-sm text-text-secondary">33%</span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div className="bg-primary rounded-full h-2" style={{ width: '33%' }}></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Set Up Your First Site</h1>
              <p className="text-text-secondary mt-1">
                Create your first site to start managing compliance
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="site_name" className="block text-sm font-medium text-text-primary mb-2">
                Site Name <span className="text-danger">*</span>
              </label>
              <Input
                id="site_name"
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                required
                placeholder="e.g., Main Manufacturing Site"
              />
            </div>

            <div>
              <label htmlFor="regulator" className="block text-sm font-medium text-text-primary mb-2">
                Regulator (Optional)
              </label>
              <select
                id="regulator"
                value={formData.regulator}
                onChange={(e) => setFormData({ ...formData, regulator: e.target.value })}
                className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select regulator</option>
                <option value="EA">Environment Agency (EA)</option>
                <option value="SEPA">SEPA (Scotland)</option>
                <option value="NRW">NRW (Wales)</option>
                <option value="NIEA">NIEA (N. Ireland)</option>
              </select>
            </div>

            <div>
              <label htmlFor="water_company" className="block text-sm font-medium text-text-primary mb-2">
                Water Company (Optional)
              </label>
              <Input
                id="water_company"
                type="text"
                value={formData.water_company}
                onChange={(e) => setFormData({ ...formData, water_company: e.target.value })}
                placeholder="e.g., Thames Water"
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger rounded-lg p-4">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Skip for now
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createSiteMutation.isPending}
                loading={createSiteMutation.isPending}
                icon={<ArrowRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

