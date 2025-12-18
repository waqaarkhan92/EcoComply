'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';

export default function UploadEvidencePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const obligationId = params.obligationId as string;

  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('PHOTO');
  const [compliancePeriod, setCompliancePeriod] = useState('');
  const [notes, setNotes] = useState('');

  const uploadEvidence = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiClient.upload('/evidence', formData);
    },
    onSuccess: async (response) => {
      const evidenceId = (response.data as { id?: string })?.id;
      if (evidenceId && obligationId) {
        // Link evidence to obligation
        await apiClient.post(`/obligations/${obligationId}/evidence/${evidenceId}/link`, {
          compliance_period: compliancePeriod || undefined,
          notes: notes || undefined,
        });
      }
      router.push(`/dashboard/sites/${siteId}/obligations/${obligationId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('site_id', siteId);
    formData.append('evidence_type', evidenceType);
    if (notes) formData.append('notes', notes);

    uploadEvidence.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload Evidence</h1>
          <p className="text-gray-600 mt-1">Add evidence for this obligation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Evidence Type</label>
          <select
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="PHOTO">Photo</option>
            <option value="DOCUMENT">Document</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="REPORT">Report</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Compliance Period (Optional)</label>
          <input
            type="text"
            value={compliancePeriod}
            onChange={(e) => setCompliancePeriod(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., 2025-Q1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={uploadEvidence.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {uploadEvidence.isPending ? 'Uploading...' : 'Upload Evidence'}
          </Button>
        </div>
      </form>
    </div>
  );
}

