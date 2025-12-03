'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface ValidationRule {
  id: string;
  waste_stream_id: string | null;
  rule_type: 'CARRIER_LICENCE' | 'VOLUME_LIMIT' | 'STORAGE_DURATION' | 'EWC_CODE' | 'DESTINATION' | 'CUSTOM';
  rule_name: string;
  rule_description: string | null;
  rule_config: any;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  is_active: boolean;
}

interface WasteStream {
  id: string;
  ewc_code: string;
  waste_description: string;
}

export default function EditValidationRulePage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rule, isLoading } = useQuery<ValidationRule>({
    queryKey: ['validation-rule', ruleId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ValidationRule>(`/module-4/validation-rules/${ruleId}`);
      return response.data;
    },
  });

  const { data: wasteStreamsData } = useQuery({
    queryKey: ['waste-streams-list'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<{ data: WasteStream[] }>('/module-4/waste-streams?limit=100');
      return response.data;
    },
  });

  const [formData, setFormData] = useState({
    waste_stream_id: '',
    rule_type: 'CUSTOM' as 'CARRIER_LICENCE' | 'VOLUME_LIMIT' | 'STORAGE_DURATION' | 'EWC_CODE' | 'DESTINATION' | 'CUSTOM',
    rule_name: '',
    rule_description: '',
    rule_config: '',
    severity: 'ERROR' as 'ERROR' | 'WARNING' | 'INFO',
    is_active: true,
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        waste_stream_id: rule.waste_stream_id || '',
        rule_type: rule.rule_type,
        rule_name: rule.rule_name || '',
        rule_description: rule.rule_description || '',
        rule_config: JSON.stringify(rule.rule_config, null, 2),
        severity: rule.severity,
        is_active: rule.is_active,
      });
    }
  }, [rule]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-4/validation-rules/${ruleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['module-4-validation-rules'] });
      router.push(`/dashboard/module-4/validation-rules/${ruleId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update validation rule:', error);
      alert('Failed to update validation rule. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let ruleConfig: any = {};
    
    try {
      if (formData.rule_config) {
        ruleConfig = JSON.parse(formData.rule_config);
      }
    } catch (error) {
      alert('Invalid JSON in rule config. Please check the format.');
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      ...formData,
      waste_stream_id: formData.waste_stream_id || null,
      rule_description: formData.rule_description || null,
      rule_config: ruleConfig,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading validation rule...</div>;
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Validation rule not found</p>
        <Link href="/dashboard/module-4/validation-rules">
          <Button variant="outline" className="mt-4">
            Back to Validation Rules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-4/validation-rules/${ruleId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Validation Rule
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Validation Rule</h1>
        <p className="text-text-secondary mt-2">
          Update validation rule details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="rule_name">Rule Name *</Label>
            <Input
              id="rule_name"
              required
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              placeholder="e.g., Maximum Volume Check"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="rule_type">Rule Type *</Label>
            <select
              id="rule_type"
              required
              value={formData.rule_type}
              onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="CARRIER_LICENCE">Carrier Licence</option>
              <option value="VOLUME_LIMIT">Volume Limit</option>
              <option value="STORAGE_DURATION">Storage Duration</option>
              <option value="EWC_CODE">EWC Code</option>
              <option value="DESTINATION">Destination</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <Label htmlFor="waste_stream_id">Waste Stream (Optional)</Label>
            <select
              id="waste_stream_id"
              value={formData.waste_stream_id}
              onChange={(e) => setFormData({ ...formData, waste_stream_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="">All Waste Streams</option>
              {wasteStreamsData?.data.map((stream: WasteStream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.ewc_code} - {stream.waste_description.substring(0, 50)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="severity">Severity *</Label>
            <select
              id="severity"
              required
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="rule_description">Rule Description</Label>
            <textarea
              id="rule_description"
              value={formData.rule_description}
              onChange={(e) => setFormData({ ...formData, rule_description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Describe what this rule validates..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="rule_config">Rule Configuration (JSON) *</Label>
            <textarea
              id="rule_config"
              required
              value={formData.rule_config}
              onChange={(e) => setFormData({ ...formData, rule_config: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm mt-1"
            />
            <p className="text-xs text-text-secondary mt-1">
              Enter JSON configuration for this rule.
            </p>
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
                Active (rule will be applied to consignment notes)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-4/validation-rules/${ruleId}`}>
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

