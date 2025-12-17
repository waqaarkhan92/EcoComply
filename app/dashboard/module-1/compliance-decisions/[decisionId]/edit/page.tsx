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

interface ComplianceDecision {
  id: string;
  decision_type: 'COMPLIANCE' | 'NON_COMPLIANCE' | 'PARTIAL_COMPLIANCE' | 'NOT_APPLICABLE' | 'DEFERRED';
  decision_date: string;
  rationale: string;
  evidence_references: string[];
  impact_assessment: string | null;
  review_date: string | null;
  review_notes: string | null;
  is_active: boolean;
}

export default function EditComplianceDecisionPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    decision_type: 'COMPLIANCE' as 'COMPLIANCE' | 'NON_COMPLIANCE' | 'PARTIAL_COMPLIANCE' | 'NOT_APPLICABLE' | 'DEFERRED',
    decision_date: '',
    rationale: '',
    evidence_references: '',
    impact_assessment: '',
    review_date: '',
    review_notes: '',
    is_active: true,
  });

  const { data: decision, isLoading } = useQuery({
    queryKey: ['compliance-decision', decisionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ComplianceDecision>(`/module-1/compliance-decisions/${decisionId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (decision) {
      setFormData({
        decision_type: decision.decision_type,
        decision_date: decision.decision_date.split('T')[0],
        rationale: decision.rationale,
        evidence_references: decision.evidence_references?.join(', ') || '',
        impact_assessment: decision.impact_assessment || '',
        review_date: decision.review_date ? decision.review_date.split('T')[0] : '',
        review_notes: decision.review_notes || '',
        is_active: decision.is_active,
      });
    }
  }, [decision]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-1/compliance-decisions/${decisionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-decision', decisionId] });
      queryClient.invalidateQueries({ queryKey: ['module-1-compliance-decisions'] });
      router.push(`/dashboard/module-1/compliance-decisions/${decisionId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update compliance decision:', error);
      alert('Failed to update compliance decision. Please try again.');
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
      evidence_references: formData.evidence_references
        ? formData.evidence_references.split(',').map((ref) => ref.trim()).filter(Boolean)
        : [],
      impact_assessment: formData.impact_assessment || undefined,
      review_date: formData.review_date || undefined,
      review_notes: formData.review_notes || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading compliance decision...</div>;
  }

  if (!decision) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Compliance decision not found</p>
        <Link href="/dashboard/module-1/compliance-decisions">
          <Button variant="outline" className="mt-4">
            Back to Compliance Decisions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/compliance-decisions/${decisionId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Compliance Decision
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Compliance Decision</h1>
        <p className="text-text-secondary mt-2">
          Update compliance decision details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="decision_type">Decision Type *</Label>
            <select
              id="decision_type"
              required
              value={formData.decision_type}
              onChange={(e) => setFormData({ ...formData, decision_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="COMPLIANCE">Compliance</option>
              <option value="NON_COMPLIANCE">Non-Compliance</option>
              <option value="PARTIAL_COMPLIANCE">Partial Compliance</option>
              <option value="NOT_APPLICABLE">Not Applicable</option>
              <option value="DEFERRED">Deferred</option>
            </select>
          </div>

          <div>
            <Label htmlFor="decision_date">Decision Date *</Label>
            <Input
              id="decision_date"
              type="date"
              required
              value={formData.decision_date}
              onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="rationale">Rationale *</Label>
            <textarea
              id="rationale"
              required
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="evidence_references">Evidence References (comma-separated)</Label>
            <Input
              id="evidence_references"
              value={formData.evidence_references}
              onChange={(e) => setFormData({ ...formData, evidence_references: e.target.value })}
              placeholder="e.g., EVID-001, EVID-002"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="impact_assessment">Impact Assessment</Label>
            <textarea
              id="impact_assessment"
              value={formData.impact_assessment}
              onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div>
            <Label htmlFor="review_date">Review Date</Label>
            <Input
              id="review_date"
              type="date"
              value={formData.review_date}
              onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="review_notes">Review Notes</Label>
            <textarea
              id="review_notes"
              value={formData.review_notes}
              onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (decision is currently valid)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-1/compliance-decisions/${decisionId}`}>
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

