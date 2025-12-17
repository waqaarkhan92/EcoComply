'use client';

import { useState } from 'react';
import { BarChart3, FileText, TrendingUp, AlertCircle, Users, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import {
  ResourceForecast,
  UserActivityReport,
  CostSummaryWidget,
} from '@/components/enhanced-features';

type ReportView = 'overview' | 'user-activity' | 'resource-forecast' | 'cost-analysis';

const reportTypes = [
  {
    id: 'compliance-summary',
    name: 'Compliance Summary',
    description: 'Overview of compliance status across all sites',
    icon: BarChart3,
    color: 'text-blue-600',
  },
  {
    id: 'deadline-report',
    name: 'Deadline Report',
    description: 'Upcoming and overdue deadlines',
    icon: AlertCircle,
    color: 'text-red-600',
  },
  {
    id: 'obligation-status',
    name: 'Obligation Status',
    description: 'Status of all obligations by category',
    icon: FileText,
    color: 'text-green-600',
  },
  {
    id: 'trend-analysis',
    name: 'Trend Analysis',
    description: 'Compliance trends over time',
    icon: TrendingUp,
    color: 'text-purple-600',
  },
];

export default function ReportsPage() {
  const [activeView, setActiveView] = useState<ReportView>('overview');

  const views = [
    { id: 'overview' as const, label: 'Report Types', icon: FileText },
    { id: 'user-activity' as const, label: 'User Activity', icon: Users },
    { id: 'resource-forecast' as const, label: 'Resource Forecast', icon: Calendar },
    { id: 'cost-analysis' as const, label: 'Cost Analysis', icon: DollarSign },
  ];

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <PageHeader
        title="Reports"
        description="Generate and view compliance reports"
      />

      {/* View Toggle */}
      <div className="flex flex-wrap gap-2">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Overview - Report Type Cards */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <Icon className={`h-8 w-8 ${report.color}`} />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* User Activity Report */}
      {activeView === 'user-activity' && (
        <UserActivityReport defaultPeriod="30d" showExport />
      )}

      {/* Resource Forecast */}
      {activeView === 'resource-forecast' && (
        <ResourceForecast weeksAhead={8} />
      )}

      {/* Cost Analysis */}
      {activeView === 'cost-analysis' && (
        <div className="space-y-6">
          <CostSummaryWidget />
        </div>
      )}
    </div>
  );
}

