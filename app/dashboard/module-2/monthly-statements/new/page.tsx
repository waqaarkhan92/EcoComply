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

export default function NewMonthlyStatementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    document_id: '',
    site_id: '',
    statement_period_start: new Date().toISOString().split('T')[0],
    statement_period_end: new Date().toISOString().split('T')[0],
    statement_date: new Date().toISOString().split('T')[0],
    total_volume_m3: '',
    total_charge: '',
    statement_reference: '',
    water_company_name: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-2/monthly-statements', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-statements'] });
      router.push(`/dashboard/module-2/monthly-statements/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create monthly statement:', error);
      alert('Failed to create monthly statement. Please try again.');
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
      total_volume_m3: parseFloat(formData.total_volume_m3),
      total_charge: formData.total_charge ? parseFloat(formData.total_charge) : undefined,
      statement_reference: formData.statement_reference || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-2/monthly-statements"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Monthly Statements
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Monthly Statement</h1>
        <p className="text-text-secondary mt-2">
          Record a water company monthly statement
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="document_id">Document ID *</Label>
            <Input
              id="document_id"
              required
              value={formData.document_id}
              onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
              placeholder="UUID of the statement document"
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
            <Label htmlFor="water_company_name">Water Company Name *</Label>
            <Input
              id="water_company_name"
              required
              value={formData.water_company_name}
              onChange={(e) => setFormData({ ...formData, water_company_name: e.target.value })}
              placeholder="e.g., Thames Water, Severn Trent"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="statement_period_start">Period Start *</Label>
            <Input
              id="statement_period_start"
              type="date"
              required
              value={formData.statement_period_start}
              onChange={(e) => setFormData({ ...formData, statement_period_start: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="statement_period_end">Period End *</Label>
            <Input
              id="statement_period_end"
              type="date"
              required
              value={formData.statement_period_end}
              onChange={(e) => setFormData({ ...formData, statement_period_end: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="statement_date">Statement Date *</Label>
            <Input
              id="statement_date"
              type="date"
              required
              value={formData.statement_date}
              onChange={(e) => setFormData({ ...formData, statement_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="total_volume_m3">Total Volume (m³) *</Label>
            <Input
              id="total_volume_m3"
              type="number"
              step="0.0001"
              required
              value={formData.total_volume_m3}
              onChange={(e) => setFormData({ ...formData, total_volume_m3: e.target.value })}
              placeholder="0.0000"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="total_charge">Total Charge (£)</Label>
            <Input
              id="total_charge"
              type="number"
              step="0.01"
              value={formData.total_charge}
              onChange={(e) => setFormData({ ...formData, total_charge: e.target.value })}
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="statement_reference">Statement Reference</Label>
            <Input
              id="statement_reference"
              value={formData.statement_reference}
              onChange={(e) => setFormData({ ...formData, statement_reference: e.target.value })}
              placeholder="Statement reference number"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-2/monthly-statements">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Statement'}
          </Button>
        </div>
      </form>
    </div>
  );
}

