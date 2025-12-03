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

interface MonthlyStatement {
  id: string;
  statement_period_start: string;
  statement_period_end: string;
  statement_date: string;
  total_volume_m3: number;
  total_charge: number | null;
  statement_reference: string | null;
  water_company_name: string;
}

export default function EditMonthlyStatementPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}) {
  const { statementId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    statement_period_start: '',
    statement_period_end: '',
    statement_date: '',
    total_volume_m3: '',
    total_charge: '',
    statement_reference: '',
    water_company_name: '',
  });

  const { data: statement, isLoading } = useQuery<MonthlyStatement>({
    queryKey: ['monthly-statement', statementId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<MonthlyStatement>(`/module-2/monthly-statements/${statementId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (statement) {
      setFormData({
        statement_period_start: statement.statement_period_start.split('T')[0],
        statement_period_end: statement.statement_period_end.split('T')[0],
        statement_date: statement.statement_date.split('T')[0],
        total_volume_m3: statement.total_volume_m3.toString(),
        total_charge: statement.total_charge ? statement.total_charge.toString() : '',
        statement_reference: statement.statement_reference || '',
        water_company_name: statement.water_company_name,
      });
    }
  }, [statement]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-2/monthly-statements/${statementId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-statement', statementId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-statements'] });
      router.push(`/dashboard/module-2/monthly-statements/${statementId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update monthly statement:', error);
      alert('Failed to update monthly statement. Please try again.');
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

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading monthly statement...</div>;
  }

  if (!statement) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Monthly statement not found</p>
        <Link href="/dashboard/module-2/monthly-statements">
          <Button variant="outline" className="mt-4">
            Back to Monthly Statements
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-2/monthly-statements/${statementId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Statement
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Monthly Statement</h1>
        <p className="text-text-secondary mt-2">
          Update monthly statement details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="water_company_name">Water Company Name *</Label>
            <Input
              id="water_company_name"
              required
              value={formData.water_company_name}
              onChange={(e) => setFormData({ ...formData, water_company_name: e.target.value })}
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
            <Label htmlFor="total_volume_m3">Total Volume (m³) *</Label>
            <Input
              id="total_volume_m3"
              type="number"
              step="0.0001"
              required
              value={formData.total_volume_m3}
              onChange={(e) => setFormData({ ...formData, total_volume_m3: e.target.value })}
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
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="statement_reference">Statement Reference</Label>
            <Input
              id="statement_reference"
              value={formData.statement_reference}
              onChange={(e) => setFormData({ ...formData, statement_reference: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-2/monthly-statements/${statementId}`}>
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

