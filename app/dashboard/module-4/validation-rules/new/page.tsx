'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface WasteStream {
  id: string;
  ewc_code: string;
  waste_description: string;
}

export default function NewValidationRulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    waste_stream_id: '',
    rule_type: 'CUSTOM' as 'CARRIER_LICENCE' | 'VOLUME_LIMIT' | 'STORAGE_DURATION' | 'EWC_CODE' | 'DESTINATION' | 'CUSTOM',
    rule_name: '',
    rule_description: '',
    rule_config: '',
    severity: 'ERROR' as 'ERROR' | 'WARNING' | 'INFO',
    is_active: true,
  });

  // Fetch waste streams for dropdown
  const { data: wasteStreamsData } = useQuery({
    queryKey: ['waste-streams-list'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<{ data: WasteStream[] }>('/module-4/waste-streams?limit=100');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-4/validation-rules', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-4-validation-rules'] });
      router.push(`/dashboard/module-4/validation-rules/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create validation rule:', error);
      alert('Failed to create validation rule. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let ruleConfig: any = {};
    
    // Parse rule config based on rule type
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

    createMutation.mutate(submitData);
  };

  const getRuleConfigExample = (ruleType: string): string => {
    const examples: Record<string, string> = {
      VOLUME_LIMIT: JSON.stringify({ max_volume_m3: 100 }, null, 2),
      EWC_CODE: JSON.stringify({ allowed_ewc_codes: ['20 01 01', '20 01 02'] }, null, 2),
      CARRIER_LICENCE: JSON.stringify({ require_valid: true }, null, 2),
      CUSTOM: JSON.stringify({ custom_validation: 'your validation logic' }, null, 2),
    };
    return examples[ruleType] || '{}';
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-4/validation-rules"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Validation Rules
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Validation Rule</h1>
        <p className="text-text-secondary mt-2">
          Create a custom validation rule for consignment notes
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
              onChange={(e) => {
                const newType = e.target.value as any;
                setFormData({
                  ...formData,
                  rule_type: newType,
                  rule_config: getRuleConfigExample(newType),
                });
              }}
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
              placeholder={getRuleConfigExample(formData.rule_type)}
            />
            <p className="text-xs text-text-secondary mt-1">
              Enter JSON configuration for this rule. Example: {getRuleConfigExample(formData.rule_type)}
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
          <Link href="/dashboard/module-4/validation-rules">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Validation Rule'}
          </Button>
        </div>
      </form>
    </div>
  );
}

