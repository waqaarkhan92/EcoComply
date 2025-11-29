'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Link2, ArrowRight, CheckCircle } from 'lucide-react';

export default function EvidenceTutorialPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);

  // Update onboarding progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (skipped: boolean) => {
      const response = await apiClient.put('/users/me/onboarding-progress', {
        flow_type: 'FIRST_TIME',
        step: 'EVIDENCE_TUTORIAL',
        completed: !skipped,
        skipped: skipped,
      });
      return response.data;
    },
    onSuccess: (_, skipped) => {
      setCompleted(true);
      setTimeout(() => {
        router.push('/onboarding/dashboard-intro');
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
            <span className="text-sm text-text-secondary">Step 6 of 7</span>
            <span className="text-sm text-text-secondary">86%</span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div className="bg-primary rounded-full h-2" style={{ width: '86%' }}></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-8">
          {!completed ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">Link Evidence to Obligations</h1>
                <p className="text-text-secondary">
                  Evidence proves compliance with your obligations. Link documents, photos, and records to show you're meeting requirements.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-background-tertiary rounded-lg p-4">
                  <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    What is Evidence?
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Evidence includes monitoring reports, inspection records, maintenance logs, certificates, and any documents that demonstrate compliance with your obligations.
                  </p>
                </div>

                <div className="bg-background-tertiary rounded-lg p-4">
                  <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    How to Link Evidence
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Upload evidence files and link them to specific obligations. You can link one piece of evidence to multiple obligations if needed.
                  </p>
                </div>
              </div>

              <div className="bg-success/10 border border-success rounded-lg p-4 mb-6">
                <p className="text-sm text-success">
                  <strong>Next:</strong> You'll learn how to use the dashboard to track your compliance status.
                </p>
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
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Tutorial Complete!</h2>
              <p className="text-text-secondary">
                Moving to dashboard introduction...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

