'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface MonthlyStatement {
  id: string;
  site_id: string;
  statement_period_start: string;
  statement_period_end: string;
  statement_date: string;
  total_volume_m3: number;
  total_charge: number | null;
  statement_reference: string | null;
  water_company_name: string;
  documents: { id: string; document_name: string };
  sites: { id: string; site_name: string };
  created_at: string;
  updated_at: string;
}

interface StatementReconciliation {
  id: string;
  reconciliation_date: string;
  statement_volume_m3: number;
  actual_volume_m3: number;
  variance_m3: number;
  variance_percent: number;
  reconciliation_status: string;
  reconciliation_notes: string | null;
  reconciled_at: string | null;
}

export default function MonthlyStatementDetailPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}) {
  const { statementId } = use(params);
  const queryClient = useQueryClient();
  const [reconciliationForm, setReconciliationForm] = useState({
    reconciliation_date: new Date().toISOString().split('T')[0],
    actual_volume_m3: '',
    reconciliation_notes: '',
  });

  const { data: statement, isLoading } = useQuery<MonthlyStatement>({
    queryKey: ['monthly-statement', statementId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<MonthlyStatement>(`/module-2/monthly-statements/${statementId}`);
      return response.data;
    },
  });

  const { data: reconciliations } = useQuery<{ data: StatementReconciliation[] }>({
    queryKey: ['statement-reconciliations', statementId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/module-2/monthly-statements/${statementId}/reconciliations`);
    },
    enabled: !!statement,
  });

  const createReconciliationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post(`/module-2/monthly-statements/${statementId}/reconciliations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-reconciliations', statementId] });
      setReconciliationForm({
        reconciliation_date: new Date().toISOString().split('T')[0],
        actual_volume_m3: '',
        reconciliation_notes: '',
      });
    },
  });

  const handleReconciliationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createReconciliationMutation.mutate(reconciliationForm);
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
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-2/monthly-statements"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Monthly Statements
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {statement.water_company_name} Statement
          </h1>
          <p className="text-text-secondary mt-2">
            {new Date(statement.statement_period_start).toLocaleDateString()} - {new Date(statement.statement_period_end).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-2/monthly-statements/${statementId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Statement Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Statement Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Water Company</p>
            <p className="text-text-primary font-medium">{statement.water_company_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Site</p>
            <p className="text-text-primary">{statement.sites.site_name}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Period</p>
            <p className="text-text-primary">
              {new Date(statement.statement_period_start).toLocaleDateString()} - {new Date(statement.statement_period_end).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Statement Date</p>
            <p className="text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(statement.statement_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Total Volume</p>
            <p className="text-text-primary text-lg font-semibold">
              {parseFloat(statement.total_volume_m3.toString()).toLocaleString()} m³
            </p>
          </div>

          {statement.total_charge && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Total Charge</p>
              <p className="text-text-primary text-lg font-semibold">
                £{parseFloat(statement.total_charge.toString()).toLocaleString()}
              </p>
            </div>
          )}

          {statement.statement_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Reference</p>
              <p className="text-text-primary">{statement.statement_reference}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(statement.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliations Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Reconciliations</h2>

        {/* Create Reconciliation Form */}
        <form onSubmit={handleReconciliationSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-text-primary mb-4">New Reconciliation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Reconciliation Date *</label>
              <input
                type="date"
                required
                value={reconciliationForm.reconciliation_date}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, reconciliation_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Actual Volume (m³) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={reconciliationForm.actual_volume_m3}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, actual_volume_m3: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={statement.total_volume_m3.toString()}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createReconciliationMutation.isPending}>
                Create Reconciliation
              </Button>
            </div>
          </div>
        </form>

        {/* Reconciliations List */}
        {reconciliations?.data && reconciliations.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Statement Volume</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Actual Volume</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Variance</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {reconciliations.data.map((recon) => {
                  const isPositive = recon.variance_m3 >= 0;
                  return (
                    <tr key={recon.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        {new Date(recon.reconciliation_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        {parseFloat(recon.statement_volume_m3.toString()).toLocaleString()} m³
                      </td>
                      <td className="py-4 px-6">
                        {parseFloat(recon.actual_volume_m3.toString()).toLocaleString()} m³
                      </td>
                      <td className="py-4 px-6">
                        <div className={`flex items-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span className="font-medium">
                            {isPositive ? '+' : ''}{parseFloat(recon.variance_m3.toString()).toLocaleString()} m³
                          </span>
                          <span className="text-sm">
                            ({isPositive ? '+' : ''}{parseFloat(recon.variance_percent.toString()).toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          recon.reconciliation_status === 'RECONCILED' ? 'bg-green-50 text-green-700' :
                          recon.reconciliation_status === 'DISCREPANCY' ? 'bg-red-50 text-red-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {recon.reconciliation_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">No reconciliations yet</p>
        )}
      </div>
    </div>
  );
}

