'use client';

/**
 * Cost Tracker Components
 * Track and visualize compliance costs
 */

import { useState } from 'react';
import { DollarSign, Plus, TrendingUp, Building2, Calendar, PieChart } from 'lucide-react';
import {
  useObligationCosts,
  useAddObligationCost,
  useCostSummary,
  ObligationCost,
  CostSummary,
} from '@/lib/hooks/use-enhanced-features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

// Cost types with labels and colors
const costTypes = {
  LABOR: { label: 'Labor', color: '#104B3A' },
  CONTRACTOR: { label: 'Contractor', color: '#2E7D32' },
  EQUIPMENT: { label: 'Equipment', color: '#D4A017' },
  LAB_FEES: { label: 'Lab Fees', color: '#C44536' },
  CONSULTING: { label: 'Consulting', color: '#94B49F' },
  SOFTWARE: { label: 'Software', color: '#6B7280' },
  OTHER: { label: 'Other', color: '#9CA3AF' },
};

// ============================================
// Cost Summary Widget
// ============================================

interface CostSummaryWidgetProps {
  siteId?: string;
  period?: string;
}

export function CostSummaryWidget({ siteId, period = '12m' }: CostSummaryWidgetProps) {
  const { data: summary, isLoading } = useCostSummary({ siteId, period, groupBy: 'type' });

  if (isLoading) {
    return <CostSummaryWidgetSkeleton />;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Compliance Costs</h3>
        <select
          className="text-sm border border-gray-200 rounded-md px-2 py-1"
          defaultValue={period}
        >
          <option value="1m">Last Month</option>
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="12m">Last 12 Months</option>
        </select>
      </div>

      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold text-gray-900">
          {formatCurrency(summary.total, summary.currency)}
        </span>
        <span className="text-sm text-gray-500">total spend</span>
      </div>

      {/* Cost breakdown by type */}
      <div className="space-y-3">
        {Object.entries(summary.breakdown)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([type, amount]) => {
            const typeConfig = costTypes[type as keyof typeof costTypes] || costTypes.OTHER;
            const percentage = ((amount as number) / summary.total) * 100;

            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{typeConfig.label}</span>
                  <span className="font-medium">{formatCurrency(amount as number, summary.currency)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: typeConfig.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-500">
        <span>{summary.count} transactions</span>
        <span>{summary.start_date} - {summary.end_date}</span>
      </div>
    </div>
  );
}

// ============================================
// Obligation Cost List
// ============================================

interface ObligationCostListProps {
  obligationId: string;
  onAddCost?: () => void;
}

export function ObligationCostList({ obligationId, onAddCost }: ObligationCostListProps) {
  const { data: costs, isLoading } = useObligationCosts(obligationId);
  const [showAddModal, setShowAddModal] = useState(false);

  if (isLoading) {
    return <CostListSkeleton />;
  }

  const totalCost = costs?.reduce((sum, cost) => sum + cost.amount, 0) || 0;

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Costs</h3>
            <p className="text-sm text-gray-500">
              Total: <span className="font-medium text-gray-900">{formatCurrency(totalCost, 'GBP')}</span>
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Cost
          </Button>
        </div>
      </div>

      {!costs || costs.length === 0 ? (
        <div className="p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No costs recorded</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddModal(true)}>
            Add first cost
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {costs.map((cost) => (
            <CostItem key={cost.id} cost={cost} />
          ))}
        </div>
      )}

      <AddCostModal
        obligationId={obligationId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}

function CostItem({ cost }: { cost: ObligationCost }) {
  const typeConfig = costTypes[cost.cost_type as keyof typeof costTypes] || costTypes.OTHER;

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${typeConfig.color}20` }}
        >
          <DollarSign className="w-5 h-5" style={{ color: typeConfig.color }} />
        </div>
        <div>
          <p className="font-medium text-gray-900">{typeConfig.label}</p>
          {cost.description && (
            <p className="text-sm text-gray-500 truncate max-w-xs">{cost.description}</p>
          )}
          <p className="text-xs text-gray-400">{cost.incurred_date}</p>
        </div>
      </div>
      <span className="font-semibold text-gray-900">
        {formatCurrency(cost.amount, cost.currency)}
      </span>
    </div>
  );
}

// ============================================
// Add Cost Modal
// ============================================

interface AddCostModalProps {
  obligationId: string;
  isOpen: boolean;
  onClose: () => void;
}

function AddCostModal({ obligationId, isOpen, onClose }: AddCostModalProps) {
  const addCostMutation = useAddObligationCost();
  const [formData, setFormData] = useState({
    cost_type: 'LABOR',
    amount: '',
    description: '',
    incurred_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCostMutation.mutateAsync({
        obligationId,
        cost_type: formData.cost_type,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        incurred_date: formData.incurred_date,
      });
      onClose();
      setFormData({
        cost_type: 'LABOR',
        amount: '',
        description: '',
        incurred_date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Failed to add cost:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Cost">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Type</label>
          <select
            value={formData.cost_type}
            onChange={(e) => setFormData({ ...formData, cost_type: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {Object.entries(costTypes).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GBP)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Incurred</label>
          <Input
            type="date"
            value={formData.incurred_date}
            onChange={(e) => setFormData({ ...formData, incurred_date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter description..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={addCostMutation.isPending}>
            Add Cost
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// Helpers & Skeletons
// ============================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CostSummaryWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-10 w-32 mb-6" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CostListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default CostSummaryWidget;
