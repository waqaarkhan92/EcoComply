'use client';

import { BarChart3, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and view compliance reports</p>
      </div>

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
    </div>
  );
}

