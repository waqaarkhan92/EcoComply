'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';

export default function UploadConsentPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiClient.upload('/module-2/consents', formData);
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Consent document uploaded successfully. Processing will begin shortly.',
      });
      queryClient.invalidateQueries({ queryKey: ['module-2-consents'] });
      router.push(`/dashboard/sites/${siteId}/module-2/consents`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload consent document',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF, JPEG, or PNG file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > maxSize) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 50MB',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('site_id', siteId);
    formData.append('metadata', JSON.stringify({
      uploaded_via: 'web_ui',
      upload_date: new Date().toISOString(),
    }));

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/consents`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Upload Consent Document</h1>
          <p className="text-text-secondary mt-2">
            Upload a trade effluent consent document for processing
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Consent Document <span className="text-red-600">*</span>
            </label>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-text-tertiary" />
                <div className="flex text-sm text-text-secondary">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-text-tertiary">
                  PDF, PNG, JPG up to 50MB
                </p>
                {file && (
                  <p className="text-sm font-medium text-text-primary mt-2">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Uploading...</span>
                <span className="text-text-secondary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href={`/dashboard/sites/${siteId}/module-2/consents`}>
              <Button variant="secondary" type="button" disabled={isUploading}>
                Cancel
              </Button>
            </Link>
            <Button 
              variant="primary" 
              type="submit"
              disabled={!file || isUploading}
            >
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Consent
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Upload Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Upload a PDF, JPEG, or PNG file (max 50MB)</li>
          <li>The document will be processed to extract parameters automatically</li>
          <li>You can add lab results once processing is complete</li>
          <li>Processing typically takes 1-2 minutes</li>
        </ul>
      </div>
    </div>
  );
}

