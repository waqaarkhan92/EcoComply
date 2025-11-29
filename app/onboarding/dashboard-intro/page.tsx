'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

export default function DashboardIntroPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);

  // Update onboarding progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (skipped: boolean) => {
      const response = await apiClient.put('/users/me/onboarding-progress', {
        flow_type: 'FIRST_TIME',
        step: 'DASHBOARD_INTRO',
        completed: !skipped,
        skipped: skipped,
      });
      return response.data;
    },
    onSuccess: (_, skipped) => {
      setCompleted(true);
      setTimeout(() => {
        router.push('/onboarding/complete');
      }, 1500);
    },
  });

  const handleSkip = () => {
    updateProgressMutation.mutate(true);
  };

  const handleContinue = () => {
    updateProgressMutation.mutate(false);
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Step 7 of 7</span>
            <span className="text-sm text-text-secondary">100%</span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div className="bg-primary rounded-full h-2" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-8">
          {!completed ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to Your Dashboard</h1>
                <p className="text-text-secondary">
                  Your dashboard shows your compliance status at a glance
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-background-tertiary rounded-lg p-4">
                  <h3 className="font-semibold text-text-primary mb-2">Traffic Light System</h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success"></div>
                      <span><strong>Green:</strong> Compliant - All requirements met</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warning"></div>
                      <span><strong>Yellow:</strong> At Risk - Action needed soon</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger"></div>
                      <span><strong>Red:</strong> Non-Compliant - Urgent action required</span>
                    </div>
                  </div>
                </div>

                <div className="bg-background-tertiary rounded-lg p-4">
                  <h3 className="font-semibold text-text-primary mb-2">Key Features</h3>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li>• View all obligations and their status</li>
                    <li>• Track upcoming deadlines</li>
                    <li>• Upload and link evidence</li>
                    <li>• Generate compliance packs</li>
                    <li>• Review AI extractions</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-input-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={updateProgressMutation.isPending}
                >
                  Skip tutorial
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleContinue}
                  disabled={updateProgressMutation.isPending}
                  loading={updateProgressMutation.isPending}
                  icon={<ArrowRight className="h-4 w-4" />}
                  iconPosition="right"
                >
                  Finish Setup
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Almost There!</h2>
              <p className="text-text-secondary">
                Completing setup...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

