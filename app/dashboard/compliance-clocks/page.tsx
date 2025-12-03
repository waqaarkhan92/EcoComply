'use client';

import { useState } from 'react';
import { ComplianceClockWidget } from '@/components/compliance/ComplianceClockWidget';

export default function ComplianceClocksPage() {
  const [filters, setFilters] = useState({
    site_id: '',
    module_id: '',
    status: '',
    criticality: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Compliance Clocks</h1>
        <p className="text-text-secondary mt-2">
          Track countdown timers for critical compliance deadlines
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Site
            </label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Module
            </label>
            <select
              value={filters.module_id}
              onChange={(e) => setFilters({ ...filters, module_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Modules</option>
              <option value="module-1">Environmental Permits</option>
              <option value="module-2">Trade Effluent</option>
              <option value="module-3">MCPD/Generators</option>
              <option value="module-4">Hazardous Waste</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Criticality
            </label>
            <select
              value={filters.criticality}
              onChange={(e) => setFilters({ ...filters, criticality: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Levels</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      <ComplianceClockWidget
        siteId={filters.site_id}
        moduleId={filters.module_id}
        limit={50}
        showAll={false}
      />
    </div>
  );
}
