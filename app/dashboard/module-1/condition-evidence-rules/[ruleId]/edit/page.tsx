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

interface ConditionEvidenceRule {
  id: string;
  allowed_evidence_types: string[];
  required_evidence_types: string[];
  is_active: boolean;
}

export default function EditConditionEvidenceRulePage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    allowed_evidence_types: '',
    required_evidence_types: '',
    is_active: true,
  });

  const { data: rule, isLoading } = useQuery({
    queryKey: ['condition-evidence-rule', ruleId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ConditionEvidenceRule>(`/module-1/condition-evidence-rules/${ruleId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        allowed_evidence_types: rule.allowed_evidence_types.join(', '),
        required_evidence_types: rule.required_evidence_types.join(', '),
        is_active: rule.is_active,
      });
    }
  }, [rule]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-1/condition-evidence-rules/${ruleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condition-evidence-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['condition-evidence-rules'] });
      router.push(`/dashboard/module-1/condition-evidence-rules/${ruleId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update condition evidence rule:', error);
      alert('Failed to update condition evidence rule. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const allowedTypes = formData.allowed_evidence_types
      .split(',')
      .map(type => type.trim())
      .filter(type => type.length > 0);

    const requiredTypes = formData.required_evidence_types
      .split(',')
      .map(type => type.trim())
      .filter(type => type.length > 0);

    const submitData = {
      allowed_evidence_types: allowedTypes,
      required_evidence_types: requiredTypes,
      is_active: formData.is_active,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading condition evidence rule...</div>;
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Condition evidence rule not found</p>
        <Link href="/dashboard/module-1/condition-evidence-rules">
          <Button variant="outline" className="mt-4">
            Back to Condition Evidence Rules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/condition-evidence-rules/${ruleId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Rule
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Condition Evidence Rule</h1>
        <p className="text-text-secondary mt-2">
          Update condition evidence rule details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="allowed_evidence_types">Allowed Evidence Types (comma-separated)</Label>
            <Input
              id="allowed_evidence_types"
              value={formData.allowed_evidence_types}
              onChange={(e) => setFormData({ ...formData, allowed_evidence_types: e.target.value })}
              placeholder="e.g., Document, Photo, Measurement"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="required_evidence_types">Required Evidence Types (comma-separated)</Label>
            <Input
              id="required_evidence_types"
              value={formData.required_evidence_types}
              onChange={(e) => setFormData({ ...formData, required_evidence_types: e.target.value })}
              placeholder="e.g., Document, Certificate"
              className="mt-1"
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
                Active
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-1/condition-evidence-rules/${ruleId}`}>
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

