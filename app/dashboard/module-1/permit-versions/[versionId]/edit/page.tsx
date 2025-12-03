'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface PermitVersion {
  id: string;
  version_number: number;
  version_date: string;
  effective_date: string | null;
  expiry_date: string | null;
  version_type: 'INITIAL' | 'VARIATION' | 'REVOCATION' | 'SURRENDER' | 'TRANSFER';
  change_summary: string | null;
  redline_document_url: string | null;
  impact_analysis: any;
  is_current: boolean;
}

export default function EditPermitVersionPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    version_date: '',
    effective_date: '',
    expiry_date: '',
    version_type: 'INITIAL' as 'INITIAL' | 'VARIATION' | 'REVOCATION' | 'SURRENDER' | 'TRANSFER',
    change_summary: '',
    redline_document_url: '',
    impact_analysis: '',
    is_current: false,
  });

  const { data: version, isLoading } = useQuery<PermitVersion>({
    queryKey: ['permit-version', versionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitVersion>(`/module-1/permit-versions/${versionId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (version) {
      setFormData({
        version_date: version.version_date.split('T')[0],
        effective_date: version.effective_date ? version.effective_date.split('T')[0] : '',
        expiry_date: version.expiry_date ? version.expiry_date.split('T')[0] : '',
        version_type: version.version_type,
        change_summary: version.change_summary || '',
        redline_document_url: version.redline_document_url || '',
        impact_analysis: version.impact_analysis ? JSON.stringify(version.impact_analysis, null, 2) : '',
        is_current: version.is_current,
      });
    }
  }, [version]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-1/permit-versions/${versionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-version', versionId] });
      queryClient.invalidateQueries({ queryKey: ['module-1-permit-versions'] });
      router.push(`/dashboard/module-1/permit-versions/${versionId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update permit version:', error);
      alert('Failed to update permit version. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      effective_date: formData.effective_date || undefined,
      expiry_date: formData.expiry_date || undefined,
      change_summary: formData.change_summary || undefined,
      redline_document_url: formData.redline_document_url || undefined,
      impact_analysis: formData.impact_analysis ? JSON.parse(formData.impact_analysis) : undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading permit version...</div>;
  }

  if (!version) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Permit version not found</p>
        <Link href="/dashboard/module-1/permit-versions">
          <Button variant="outline" className="mt-4">
            Back to Permit Versions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/permit-versions/${versionId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Permit Version
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Permit Version</h1>
        <p className="text-text-secondary mt-2">
          Update permit version details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="version_date">Version Date *</Label>
            <Input
              id="version_date"
              type="date"
              required
              value={formData.version_date}
              onChange={(e) => setFormData({ ...formData, version_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="version_type">Version Type *</Label>
            <select
              id="version_type"
              required
              value={formData.version_type}
              onChange={(e) => setFormData({ ...formData, version_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="INITIAL">Initial</option>
              <option value="VARIATION">Variation</option>
              <option value="REVOCATION">Revocation</option>
              <option value="SURRENDER">Surrender</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div>
            <Label htmlFor="effective_date">Effective Date</Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="change_summary">Change Summary</Label>
            <textarea
              id="change_summary"
              value={formData.change_summary}
              onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="redline_document_url">Redline Document URL</Label>
            <Input
              id="redline_document_url"
              type="url"
              value={formData.redline_document_url}
              onChange={(e) => setFormData({ ...formData, redline_document_url: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="impact_analysis">Impact Analysis (JSON)</Label>
            <textarea
              id="impact_analysis"
              value={formData.impact_analysis}
              onChange={(e) => setFormData({ ...formData, impact_analysis: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_current" className="cursor-pointer">
                Mark as current version
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-1/permit-versions/${versionId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

