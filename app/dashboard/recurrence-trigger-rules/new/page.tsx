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

export default function NewRecurrenceTriggerRulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    schedule_id: '',
    site_id: '',
    rule_type: 'EVENT_BASED',
    rule_config: '{"offset_months": 6}',
    trigger_expression: '',
    event_id: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/recurrence-trigger-rules', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-trigger-rules'] });
      router.push(`/dashboard/recurrence-trigger-rules/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create trigger rule:', error);
      alert('Failed to create trigger rule. Please try again.');
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
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/recurrence-trigger-rules"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Trigger Rules
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Trigger Rule</h1>
        <p className="text-text-secondary mt-2">
          Create a dynamic rule that triggers recurring tasks
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="schedule_id">Schedule ID *</Label>
            <Input
              id="schedule_id"
              required
              value={formData.schedule_id}
              onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
              placeholder="UUID of the schedule"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="site_id">Site ID *</Label>
            <Input
              id="site_id"
              required
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              placeholder="UUID of the site"
              className="mt-1"
            />
          </div>

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
              <Label htmlFor="event_id">Event ID (optional)</Label>
              <Input
                id="event_id"
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                placeholder="UUID of recurrence event"
                className="mt-1"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <Label htmlFor="rule_config">Rule Configuration (JSON) *</Label>
            <textarea
              id="rule_config"
              required
              value={formData.rule_config}
              onChange={(e) => setFormData({ ...formData, rule_config: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
              placeholder='{"offset_months": 6, "recurrence_interval_months": 12}'
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="trigger_expression">Trigger Expression (optional)</Label>
            <Input
              id="trigger_expression"
              value={formData.trigger_expression}
              onChange={(e) => setFormData({ ...formData, trigger_expression: e.target.value })}
              placeholder="e.g., event_date + 6 months"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/recurrence-trigger-rules">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </div>
  );
}

