'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Upload, ArrowRight } from 'lucide-react';

export default function UploadMethodPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<'pdf' | 'excel' | null>(null);

  // Update onboarding progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (step: string) => {
      const response = await apiClient.put('/users/me/onboarding-progress', {
        flow_type: 'FIRST_TIME',
        step,
        completed: true,
      });
      return response.data;
    },
    onSuccess: (_, step) => {
      if (step === 'UPLOAD_METHOD_SELECTION') {
        if (selectedMethod === 'pdf') {
          router.push('/onboarding/document-upload');
        } else {
          router.push('/onboarding/excel-import');
        }
      }
    },
  });

  const handleContinue = () => {
    if (!selectedMethod) {
      return;
    }

    updateProgressMutation.mutate('UPLOAD_METHOD_SELECTION');
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Step 3 of 6</span>
            <span className="text-sm text-text-secondary">50%</span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div className="bg-primary rounded-full h-2" style={{ width: '50%' }}></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Upload Your First Document</h1>
            <p className="text-text-secondary">
              Choose how you'd like to add your compliance obligations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* PDF Upload Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod('pdf')}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedMethod === 'pdf'
                  ? 'border-primary bg-primary/5'
                  : 'border-input-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-2">Upload PDF Document</h3>
                  <p className="text-sm text-text-secondary">
                    Upload a permit, consent, or registration document. Our AI will extract obligations automatically.
                  </p>
                </div>
                {selectedMethod === 'pdf' && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </button>

            {/* Excel Import Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod('excel')}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedMethod === 'excel'
                  ? 'border-primary bg-primary/5'
                  : 'border-input-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-2">Import from Excel</h3>
                  <p className="text-sm text-text-secondary">
                    Import obligations from an existing spreadsheet. Perfect if you already have a list.
                  </p>
                </div>
                {selectedMethod === 'excel' && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-input-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Skip for now
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleContinue}
              disabled={!selectedMethod || updateProgressMutation.isPending}
              loading={updateProgressMutation.isPending}
              icon={<ArrowRight className="h-4 w-4" />}
              iconPosition="right"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

