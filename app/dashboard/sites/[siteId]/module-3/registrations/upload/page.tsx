'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText } from 'lucide-react';
import Link from 'next/link';

export default function UploadMCPDRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiClient.post('/module-3/mcpd-registrations', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-3-registrations'] });
      router.push(`/dashboard/sites/${siteId}/module-3/registrations`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !siteId) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('site_id', siteId);
    
    const metadata: any = {};
    if (title) metadata.title = title;
    if (referenceNumber) metadata.reference_number = referenceNumber;
    
    if (Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    mutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/registrations`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Upload MCPD Registration</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-6 max-w-2xl">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-text-primary mb-2">
            Registration Document (PDF) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-md hover:border-primary transition-colors">
            <div className="space-y-1 text-center">
              <FileText className="mx-auto h-12 w-12 text-text-tertiary" />
              <div className="flex text-sm text-text-secondary">
                <label
                  htmlFor="file"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                >
                  <span>Upload a file</span>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-text-tertiary">PDF up to 50MB</p>
              {file && (
                <p className="text-sm text-text-primary mt-2">{file.name}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-2">
            Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., MCPD Registration 2025"
          />
        </div>

        <div>
          <label htmlFor="reference_number" className="block text-sm font-medium text-text-primary mb-2">
            Reference Number (Optional)
          </label>
          <input
            type="text"
            id="reference_number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., MCPD/12345"
          />
        </div>

        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to upload registration'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending || !file}>
            <Upload className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Uploading...' : 'Upload Registration'}
          </Button>
          <Link href={`/dashboard/sites/${siteId}/module-3/registrations`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

