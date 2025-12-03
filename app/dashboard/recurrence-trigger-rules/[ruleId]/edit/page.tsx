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
import VisualTriggerBuilder from '@/components/recurrence-triggers/VisualTriggerBuilder';

interface RecurrenceTriggerRule {
  id: string;
  rule_type: string;
  rule_config: any;
  trigger_expression: string | null;
  event_id: string | null;
  is_active: boolean;
  next_execution_date: string | null;
}

export default function EditRecurrenceTriggerRulePage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rule_type: 'EVENT_BASED',
    rule_config: '{}',
    trigger_expression: '',
    event_id: '',
    is_active: true,
    next_execution_date: '',
  });

  const { data: rule, isLoading } = useQuery<RecurrenceTriggerRule>({
    queryKey: ['recurrence-trigger-rule', ruleId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurrenceTriggerRule>(`/recurrence-trigger-rules/${ruleId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        rule_type: rule.rule_type,
        rule_config: JSON.stringify(rule.rule_config || {}, null, 2),
        trigger_expression: rule.trigger_expression || '',
        event_id: rule.event_id || '',
        is_active: rule.is_active,
        next_execution_date: rule.next_execution_date ? rule.next_execution_date.split('T')[0] : '',
      });
    }
  }, [rule]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/recurrence-trigger-rules/${ruleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-trigger-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-trigger-rules'] });
      router.push(`/dashboard/recurrence-trigger-rules/${ruleId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update trigger rule:', error);
      alert('Failed to update trigger rule. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let ruleConfig = {};
    try {
      ruleConfig = JSON.parse(formData.rule_config);
    } catch (e) {
      alert('Invalid JSON in rule config');
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      ...formData,
      rule_config: ruleConfig,
      event_id: formData.event_id || undefined,
      trigger_expression: formData.trigger_expression || undefined,
      next_execution_date: formData.next_execution_date || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading trigger rule...</div>;
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Trigger rule not found</p>
        <Link href="/dashboard/recurrence-trigger-rules">
          <Button variant="outline" className="mt-4">
            Back to Trigger Rules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/recurrence-trigger-rules/${ruleId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Trigger Rule
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Trigger Rule</h1>
        <p className="text-text-secondary mt-2">
          Update trigger rule configuration
        </p>
      </div>

      {/* Visual Builder Integration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <VisualTriggerBuilder
          triggerDefinition={{
            rule_type: formData.rule_type,
            rule_config: formData.rule_config ? JSON.parse(formData.rule_config) : {},
            trigger_expression: formData.trigger_expression,
          }}
          onUpdate={(newDef) => {
            setFormData({
              ...formData,
              rule_type: newDef.rule_type,
              rule_config: JSON.stringify(newDef.rule_config, null, 2),
              trigger_expression: newDef.trigger_expression || '',
            });
          }}
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="rule_type">Rule Type *</Label>
            <select
              id="rule_type"
              required
              value={formData.rule_type}
              onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="DYNAMIC_OFFSET">Dynamic Offset</option>
              <option value="EVENT_BASED">Event Based</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>

          {formData.rule_type === 'EVENT_BASED' && (
            <div>
              <Label htmlFor="event_id">Event ID</Label>
              <Input
                id="event_id"
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="next_execution_date">Next Execution Date</Label>
            <Input
              id="next_execution_date"
              type="date"
              value={formData.next_execution_date}
              onChange={(e) => setFormData({ ...formData, next_execution_date: e.target.value })}
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

          <div className="md:col-span-2">
            <Label htmlFor="rule_config">Rule Configuration (JSON) *</Label>
            <textarea
              id="rule_config"
              required
              value={formData.rule_config}
              onChange={(e) => setFormData({ ...formData, rule_config: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="trigger_expression">Trigger Expression</Label>
            <Input
              id="trigger_expression"
              value={formData.trigger_expression}
              onChange={(e) => setFormData({ ...formData, trigger_expression: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/recurrence-trigger-rules/${ruleId}`}>
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

