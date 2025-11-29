'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

export default function OnboardingCompletePage() {
  const router = useRouter();

  // Mark onboarding as complete
  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put('/users/me/onboarding-progress', {
        flow_type: 'FIRST_TIME',
        step: 'COMPLETE',
        completed: true,
      });
      return response.data;
    },
    onSuccess: () => {
      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    },
  });

  useEffect(() => {
    // Automatically mark as complete when page loads
    completeMutation.mutate();
  }, []);

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-success/10 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-success" />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-bold text-text-primary">Welcome to Oblicore!</h1>
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          
          <p className="text-xl text-text-secondary mb-8">
            You're all set up and ready to manage your compliance
          </p>

          <div className="bg-background-tertiary rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-text-primary mb-4">What's Next?</h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <span>Review extracted obligations in the Review Queue</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <span>Upload evidence to link to your obligations</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <span>Generate your first compliance pack</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <span>Explore the dashboard to track your compliance status</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/dashboard')}
              icon={<ArrowRight className="h-5 w-5" />}
              iconPosition="right"
            >
              Go to Dashboard
            </Button>
          </div>

          <p className="text-sm text-text-tertiary mt-6">
            Redirecting to dashboard in a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
}

