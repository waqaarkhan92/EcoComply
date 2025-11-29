'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, FileSpreadsheet } from 'lucide-react';

export default function ImportPreviewPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  // Update onboarding progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async () => {
      // Mark both IMPORT_PREVIEW and IMPORT_CONFIRMATION as complete
      await apiClient.put('/users/me/onboarding-progress', {
        flow_type: 'FIRST_TIME',
        step: 'IMPORT_PREVIEW',
        completed: true,
      });
      const response = await apiClient.put('/users/me/onboarding-progress', {
        flow_type: 'FIRST_TIME',
        step: 'IMPORT_CONFIRMATION',
        completed: true,
      });
      return response.data;
    },
    onSuccess: () => {
      setConfirmed(true);
      setTimeout(() => {
        router.push('/onboarding/evidence-tutorial');
      }, 2000);
    },
  });

  const handleConfirm = () => {
    updateProgressMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Step 5 of 6</span>
            <span className="text-sm text-text-secondary">83%</span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div className="bg-primary rounded-full h-2" style={{ width: '83%' }}></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-8">
          {!confirmed ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">Review Import Preview</h1>
                <p className="text-text-secondary">
                  Review the obligations that will be imported from your Excel file
                </p>
              </div>

              <div className="bg-background-tertiary rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-text-primary mb-4">What to Review:</h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>Verify all obligations were imported correctly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>Check dates and deadlines are accurate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>Confirm categories and frequencies are correct</span>
                  </li>
                </ul>
              </div>

              <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-6">
                <p className="text-sm text-warning">
                  <strong>Tip:</strong> You can review and edit imported obligations later. For now, let's continue with the tutorial.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-input-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Skip tutorial
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={updateProgressMutation.isPending}
                  loading={updateProgressMutation.isPending}
                  icon={<ArrowRight className="h-4 w-4" />}
                  iconPosition="right"
                >
                  Confirm Import
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Import Confirmed!</h2>
              <p className="text-text-secondary">
                Moving to the next step...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

