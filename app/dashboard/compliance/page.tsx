'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { RegulatoryStatsOverview } from '@/components/regulatory';
import { Shield } from 'lucide-react';

export default function ComplianceDashboardPage() {
  const { company } = useAuthStore();

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-primary">Regulatory Compliance</h1>
          </div>
          <p className="text-text-secondary mt-2">
            EA Compliance Classification Scheme (CCS) dashboard and regulatory pack management
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <RegulatoryStatsOverview companyId={company.id} />
    </div>
  );
}
