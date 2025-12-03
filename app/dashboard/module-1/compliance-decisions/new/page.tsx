'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewComplianceDecisionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    site_id: '',
    obligation_id: '',
    decision_type: 'COMPLIANCE' as 'COMPLIANCE' | 'NON_COMPLIANCE' | 'PARTIAL_COMPLIANCE' | 'NOT_APPLICABLE' | 'DEFERRED',
    decision_date: new Date().toISOString().split('T')[0],
    rationale: '',
    evidence_references: '',
    impact_assessment: '',
    review_date: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-1/compliance-decisions', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-1-compliance-decisions'] });
      router.push(`/dashboard/module-1/compliance-decisions/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create compliance decision:', error);
      alert('Failed to create compliance decision. Please try again.');
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
      obligation_id: formData.obligation_id || undefined,
      evidence_references: formData.evidence_references
        ? formData.evidence_references.split(',').map((ref) => ref.trim()).filter(Boolean)
        : [],
      impact_assessment: formData.impact_assessment || undefined,
      review_date: formData.review_date || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-1/compliance-decisions"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Compliance Decisions
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Compliance Decision</h1>
        <p className="text-text-secondary mt-2">
          Document a compliance decision with justification
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="site_id">Site *</Label>
            <select
              id="site_id"
              required
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="">Select a site</option>
              {/* TODO: Fetch sites from API */}
            </select>
          </div>

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

          <div>
            <Label htmlFor="obligation_id">Related Obligation ID (optional)</Label>
            <Input
              id="obligation_id"
              value={formData.obligation_id}
              onChange={(e) => setFormData({ ...formData, obligation_id: e.target.value })}
              placeholder="UUID of related obligation"
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
              placeholder="Provide detailed justification for this compliance decision..."
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
            <p className="text-sm text-text-secondary mt-1">
              Enter evidence reference IDs separated by commas
            </p>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="impact_assessment">Impact Assessment</Label>
            <textarea
              id="impact_assessment"
              value={formData.impact_assessment}
              onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Assess the impact of this decision..."
            />
          </div>

          <div>
            <Label htmlFor="review_date">Review Date (optional)</Label>
            <Input
              id="review_date"
              type="date"
              value={formData.review_date}
              onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-1/compliance-decisions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Compliance Decision'}
          </Button>
        </div>
      </form>
    </div>
  );
}

