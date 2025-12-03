/**
 * Phase 2 UI/UX Components - Real-World Usage Examples
 *
 * This file demonstrates how to use all Phase 2 components together
 * in a production-ready page.
 */

'use client';

import { useState } from 'react';
import { DataTable, ColumnDef } from '@/components/ui/enhanced/data-table';
import { FormField } from '@/components/ui/enhanced/form-field';
import { ComplianceChart, CircularProgress } from '@/components/ui/enhanced/compliance-chart';
import { StatusBadge } from '@/components/ui/enhanced/status-badge';
import { EmptyState } from '@/components/ui/enhanced/empty-state';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

// ============================================================================
// Example 1: Complete Dashboard Page
// ============================================================================

export function DashboardExample() {
  return (
    <div className="space-y-8">
      {/* Page Header - Using Typography */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-heading-xl text-text-primary mb-2">
          Compliance Dashboard
        </h1>
        <p className="text-body-lg text-text-secondary">
          Monitor your compliance status and track obligations across all sites
        </p>
      </div>

      {/* Stats Grid - Using Circular Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-card p-6 flex flex-col items-center">
          <CircularProgress
            value={87}
            max={100}
            size={120}
            label="Overall Compliance"
            showPercentage
          />
        </div>

        <div className="bg-white rounded-lg shadow-card p-6 flex flex-col items-center">
          <CircularProgress
            value={62}
            max={100}
            size={120}
            label="Evidence Coverage"
            showPercentage
          />
        </div>

        <div className="bg-white rounded-lg shadow-card p-6 flex flex-col items-center">
          <CircularProgress
            value={94}
            max={100}
            size={120}
            label="On-Time Completion"
            showPercentage
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Compliance Trends */}
        <ComplianceChart
          type="line"
          data={[
            { name: 'Jan', completed: 45, pending: 12, overdue: 3 },
            { name: 'Feb', completed: 52, pending: 8, overdue: 2 },
            { name: 'Mar', completed: 61, pending: 10, overdue: 1 },
            { name: 'Apr', completed: 58, pending: 15, overdue: 4 },
            { name: 'May', completed: 70, pending: 9, overdue: 2 },
            { name: 'Jun', completed: 78, pending: 7, overdue: 1 },
          ]}
          dataKeys={['completed', 'pending', 'overdue']}
          title="Obligation Trends"
          description="Track compliance over the last 6 months"
          height={300}
          showGrid
          showLegend
        />

        {/* Bar Chart - Status Breakdown */}
        <ComplianceChart
          type="bar"
          data={[
            { name: 'Pending', value: 23 },
            { name: 'In Progress', value: 15 },
            { name: 'Completed', value: 78 },
            { name: 'Overdue', value: 5 },
          ]}
          title="Current Status"
          description="Obligation status breakdown"
          height={300}
          showGrid={false}
          showLegend={false}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Obligations List Page with DataTable
// ============================================================================

interface Obligation {
  id: string;
  title: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'DUE_SOON';
  deadline_date: string;
  evidence_count: number;
  site_name: string;
}

export function ObligationsListExample() {
  const obligations: Obligation[] = [
    {
      id: '1',
      title: 'Submit annual emissions report to EA',
      status: 'DUE_SOON',
      deadline_date: '2025-12-15',
      evidence_count: 3,
      site_name: 'London Data Centre',
    },
    {
      id: '2',
      title: 'Complete monthly trade effluent sampling',
      status: 'COMPLETED',
      deadline_date: '2025-11-30',
      evidence_count: 5,
      site_name: 'Manchester Plant',
    },
    {
      id: '3',
      title: 'Update emergency response procedures',
      status: 'OVERDUE',
      deadline_date: '2025-11-01',
      evidence_count: 0,
      site_name: 'Birmingham Facility',
    },
  ];

  const columns: ColumnDef<Obligation>[] = [
    {
      id: 'title',
      header: 'Obligation',
      accessorKey: 'title',
      sortable: true,
      mobileLabel: 'Title',
    },
    {
      id: 'site',
      header: 'Site',
      accessorKey: 'site_name',
      sortable: true,
      mobileLabel: 'Site',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} size="sm" />,
      sortable: true,
    },
    {
      id: 'deadline',
      header: 'Deadline',
      accessorKey: 'deadline_date',
      cell: (item) => (
        <span className="text-body-md">
          {new Date(item.deadline_date).toLocaleDateString()}
        </span>
      ),
      sortable: true,
      mobileLabel: 'Due Date',
    },
    {
      id: 'evidence',
      header: 'Evidence',
      cell: (item) => (
        <span className="text-body-md text-text-secondary">
          {item.evidence_count} items
        </span>
      ),
      mobileLabel: 'Evidence',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl text-text-primary mb-2">Obligations</h1>
          <p className="text-body-lg text-text-secondary">
            Manage and track your compliance obligations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Obligation
        </Button>
      </div>

      {/* Enhanced Table with Sorting & Mobile Support */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <DataTable
          data={obligations}
          columns={columns}
          onRowClick={(item) => console.log('Navigate to:', item.id)}
          emptyMessage="No obligations found"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Form Page with Validation & Auto-Save
// ============================================================================

export function ObligationFormExample() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    frequency: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleAutoSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Auto-saved:', formData);
    setIsSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-heading-xl text-text-primary mb-2">
          Edit Obligation
        </h1>
        <p className="text-body-lg text-text-secondary">
          Update obligation details and requirements
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-card p-8 space-y-6">
        {/* Text Input with Character Counter */}
        <FormField
          label="Obligation Title"
          name="title"
          type="text"
          value={formData.title}
          onChange={(value) => setFormData({ ...formData, title: value as string })}
          required
          maxLength={200}
          showCharCount
          placeholder="Enter a clear, descriptive title"
          hint="This title will appear in reports and compliance packs"
          error={errors.title}
        />

        {/* Textarea with Auto-Save */}
        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value as string })}
          autoSave
          autoSaveDelay={2000}
          onAutoSave={handleAutoSave}
          rows={6}
          maxLength={1000}
          showCharCount
          placeholder="Provide detailed information about this obligation"
          hint="Changes are saved automatically"
        />

        {/* Select Dropdown */}
        <FormField
          label="Category"
          name="category"
          type="select"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as string })}
          required
          options={[
            { label: 'Monitoring & Reporting', value: 'MONITORING' },
            { label: 'Operational Limits', value: 'LIMITS' },
            { label: 'Documentation', value: 'DOCUMENTATION' },
            { label: 'Maintenance', value: 'MAINTENANCE' },
          ]}
          placeholder="Select a category"
        />

        {/* Frequency Selector */}
        <FormField
          label="Frequency"
          name="frequency"
          type="select"
          value={formData.frequency}
          onChange={(value) => setFormData({ ...formData, frequency: value as string })}
          options={[
            { label: 'One-time', value: 'ONCE' },
            { label: 'Daily', value: 'DAILY' },
            { label: 'Weekly', value: 'WEEKLY' },
            { label: 'Monthly', value: 'MONTHLY' },
            { label: 'Quarterly', value: 'QUARTERLY' },
            { label: 'Annually', value: 'ANNUALLY' },
          ]}
          hint="How often must this obligation be completed?"
        />

        {/* Notes with Validation */}
        <FormField
          label="Internal Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={(value) => setFormData({ ...formData, notes: value as string })}
          rows={4}
          placeholder="Add any internal notes or reminders"
          hint="These notes are only visible to your team"
          validation={formData.notes.length > 0 ? 'success' : null}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
          <Button variant="outline">Cancel</Button>
          <Button>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 4: Empty State with Action
// ============================================================================

export function EmptyObligationsExample() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-xl text-text-primary">Obligations</h1>
      </div>

      <EmptyState
        icon={Plus}
        title="No obligations yet"
        description="Start by uploading a permit document, and we'll automatically extract your compliance obligations in under 60 seconds."
        action={{
          label: 'Upload Document',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => console.log('Navigate to upload'),
        }}
        secondaryAction={{
          label: 'Learn about obligations',
          href: '/docs/obligations',
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 5: Dashboard with Charts and Progress
// ============================================================================

export function ComplianceMetricsExample() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-heading-lg text-text-primary mb-2">
          Compliance Metrics
        </h2>
        <p className="text-body-md text-text-secondary">
          Visual overview of your compliance performance
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <CircularProgress value={87} label="Overall Score" size={100} />
        <CircularProgress value={62} label="Evidence" size={100} />
        <CircularProgress value={94} label="On-Time" size={100} />
        <CircularProgress value={45} label="At Risk" size={100} />
      </div>

      {/* Area Chart - Cumulative Progress */}
      <ComplianceChart
        type="area"
        data={[
          { name: 'Week 1', completed: 15 },
          { name: 'Week 2', completed: 28 },
          { name: 'Week 3', completed: 42 },
          { name: 'Week 4', completed: 58 },
        ]}
        title="Cumulative Compliance Progress"
        description="Track how many obligations have been completed over time"
        height={250}
      />

      {/* Pie Chart - Evidence Types */}
      <ComplianceChart
        type="pie"
        data={[
          { name: 'Reports', value: 35 },
          { name: 'Certificates', value: 25 },
          { name: 'Test Results', value: 20 },
          { name: 'Photos', value: 15 },
          { name: 'Other', value: 5 },
        ]}
        title="Evidence Type Distribution"
        description="Breakdown of evidence types across all obligations"
        height={300}
      />
    </div>
  );
}

// ============================================================================
// Export All Examples
// ============================================================================

export const Phase2Examples = {
  DashboardExample,
  ObligationsListExample,
  ObligationFormExample,
  EmptyObligationsExample,
  ComplianceMetricsExample,
};
