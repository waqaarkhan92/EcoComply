'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { FileText, Upload, CheckCircle, ArrowRight } from 'lucide-react';

export default function DocumentUploadPage() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get first site for onboarding
      const sitesResponse = await apiClient.get('/sites') as { data: { data: Array<{ id: string }> } };
      const sites = sitesResponse.data?.data || [];
      if (sites.length === 0) {
        throw new Error('No site found. Please create a site first.');
      }
      
      formData.append('site_id', sites[0].id);
      formData.append('document_type', 'PERMIT'); // Default for onboarding
      
      const response = await apiClient.upload('/documents', formData);
      return response.data as { id: string };
    },
    onSuccess: async (data: { id: string }) => {
      setUploaded(true);
      
      // Mark PERMIT_UPLOAD step as complete
      try {
        await apiClient.put('/users/me/onboarding-progress', {
          flow_type: 'FIRST_TIME',
          step: 'PERMIT_UPLOAD',
          completed: true,
          data: { document_id: data.id },
        });
      } catch (onboardingError) {
        console.warn('Failed to update onboarding progress:', onboardingError);
      }

      // Wait a moment then redirect to extraction review
      setTimeout(() => {
        router.push('/onboarding/extraction-review');
      }, 2000);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploaded(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploaded(false);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Step 4 of 6</span>
            <span className="text-sm text-text-secondary">67%</span>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div className="bg-primary rounded-full h-2" style={{ width: '67%' }}></div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-base p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Upload Your Document</h1>
            <p className="text-text-secondary">
              Upload a permit, consent, or registration document. Our AI will extract obligations automatically.
            </p>
          </div>

          {!uploaded ? (
            <>
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  file ? 'border-primary bg-primary/5' : 'border-input-border hover:border-primary/50'
                }`}
              >
                <Upload className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-text-primary font-medium mb-2">
                  {file ? file.name : 'Drag and drop your document here'}
                </p>
                <p className="text-sm text-text-secondary mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" size="md" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
                {file && (
                  <div className="mt-4">
                    <p className="text-xs text-text-secondary">
                      File size: {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex items-center justify-between pt-6 border-t border-input-border mt-6">
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
                  onClick={handleUpload}
                  disabled={!file || uploading || uploadMutation.isPending}
                  loading={uploading || uploadMutation.isPending}
                  icon={<ArrowRight className="h-4 w-4" />}
                  iconPosition="right"
                >
                  Upload & Extract
                </Button>
              </div>

              {uploadMutation.isError && (
                <div className="mt-4 bg-danger/10 border border-danger rounded-lg p-4">
                  <p className="text-sm text-danger">
                    {(uploadMutation.error as any)?.response?.data?.error?.message || 'Upload failed. Please try again.'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Document Uploaded!</h2>
              <p className="text-text-secondary mb-4">
                Your document is being processed. We'll extract obligations automatically.
              </p>
              <p className="text-sm text-text-tertiary">
                Redirecting to review page...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

