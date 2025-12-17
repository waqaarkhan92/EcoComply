'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useRememberedFilters } from '@/lib/hooks/use-smart-defaults';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatCard, StatCardGrid } from '@/components/ui';
import { NoDeadlinesState } from '@/components/ui/empty-state';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Download,
  ArrowRight,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

interface Deadline {
  id: string;
  obligation_id: string;
  site_id: string;
  due_date: string;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
  obligations?: {
    id: string;
    title: string;
    module_id?: string;
  };
  sites?: {
    id: string;
    name: string;
  };
}

interface DeadlineStats {
  overdue: number;
  this_week: number;
  this_month: number;
  total: number;
}

type FilterType = 'all' | 'overdue' | 'this-week' | 'this-month';

export default function DeadlinesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter') as FilterType | null;

  // Smart defaults - remember filter preferences
  const { filters, updateFilter, isInitialized } = useRememberedFilters('deadlines', {
    activeFilter: 'all',
    siteFilter: '',
    moduleFilter: '',
  });

  const [activeFilter, setActiveFilterState] = useState<FilterType>('all');
  const [siteFilter, setSiteFilterState] = useState<string>('');
  const [moduleFilter, setModuleFilterState] = useState<string>('');

  // Initialize from URL or remembered filters
  useEffect(() => {
    if (urlFilter) {
      setActiveFilterState(urlFilter);
    } else if (isInitialized && filters.activeFilter) {
      setActiveFilterState(filters.activeFilter as FilterType);
    }
    if (isInitialized) {
      if (filters.siteFilter) setSiteFilterState(filters.siteFilter);
      if (filters.moduleFilter) setModuleFilterState(filters.moduleFilter);
    }
  }, [urlFilter, isInitialized, filters]);

  // Wrapped setters that also persist to smart defaults
  const setActiveFilter = (value: FilterType) => {
    setActiveFilterState(value);
    updateFilter('activeFilter', value);
  };
  const setSiteFilter = (value: string) => {
    setSiteFilterState(value);
    updateFilter('siteFilter', value);
  };
  const setModuleFilter = (value: string) => {
    setModuleFilterState(value);
    updateFilter('moduleFilter', value);
  };

  // Fetch deadlines
  const { data: deadlinesData, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['deadlines', activeFilter, siteFilter, moduleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter === 'overdue') params.append('filter[status]', 'OVERDUE');
      if (activeFilter === 'this-week') params.append('filter[due_within]', '7');
      if (activeFilter === 'this-month') params.append('filter[due_within]', '30');
      if (siteFilter) params.append('filter[site_id]', siteFilter);
      if (moduleFilter) params.append('filter[module_id]', moduleFilter);

      const response = await apiClient.get(`/deadlines?${params.toString()}`);
      return response.data as Deadline[];
    },
  });

  // Fetch sites for filter
  const { data: sitesResponse } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await apiClient.get('/sites');
      return response;
    },
  });
  // Ensure sitesData is always an array
  const sitesData = Array.isArray(sitesResponse?.data)
    ? sitesResponse.data as { id: string; name: string }[]
    : [];

  // Calculate stats
  const stats: DeadlineStats = {
    overdue: deadlinesData?.filter(d => d.status === 'OVERDUE').length || 0,
    this_week: deadlinesData?.filter(d => {
      const dueDate = new Date(d.due_date);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= weekFromNow;
    }).length || 0,
    this_month: deadlinesData?.filter(d => {
      const dueDate = new Date(d.due_date);
      const now = new Date();
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= monthFromNow;
    }).length || 0,
    total: deadlinesData?.length || 0,
  };

  const deadlines = deadlinesData || [];

  // Group deadlines by date category
  const groupedDeadlines = {
    overdue: deadlines.filter(d => d.status === 'OVERDUE'),
    thisWeek: deadlines.filter(d => {
      if (d.status === 'OVERDUE') return false;
      const dueDate = new Date(d.due_date);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= weekFromNow;
    }),
    later: deadlines.filter(d => {
      if (d.status === 'OVERDUE') return false;
      const dueDate = new Date(d.due_date);
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return dueDate > weekFromNow;
    }),
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filterTabs = [
    { id: 'all' as const, label: 'All', count: stats.total },
    { id: 'overdue' as const, label: 'Overdue', count: stats.overdue, variant: 'danger' as const },
    { id: 'this-week' as const, label: 'This Week', count: stats.this_week, variant: 'warning' as const },
    { id: 'this-month' as const, label: 'This Month', count: stats.this_month },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines"
        description="Track all compliance deadlines across sites"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams();
                if (activeFilter !== 'all') params.append('filter', activeFilter);
                if (siteFilter) params.append('site_id', siteFilter);
                if (moduleFilter) params.append('module_id', moduleFilter);
                window.open(`/api/v1/reports/deadlines?${params.toString()}&format=csv`, '_blank');
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams();
                if (siteFilter) params.append('site_id', siteFilter);
                window.open(`/api/v1/calendar/deadlines.ics?${params.toString()}`, '_blank');
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="danger"
          onClick={() => setActiveFilter('overdue')}
        />
        <StatCard
          label="This Week"
          value={stats.this_week}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
          onClick={() => setActiveFilter('this-week')}
        />
        <StatCard
          label="This Month"
          value={stats.this_month}
          icon={<Calendar className="h-5 w-5" />}
          onClick={() => setActiveFilter('this-month')}
        />
        <StatCard
          label="Total Active"
          value={stats.total}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </StatCardGrid>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : tab.variant === 'danger'
                        ? 'bg-danger/10 text-danger'
                        : tab.variant === 'warning'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-gray-200 text-text-secondary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
              {sitesData.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Modules</option>
              <option value="MODULE_1">Permits</option>
              <option value="MODULE_2">Trade Effluent</option>
              <option value="MODULE_3">Generators</option>
              <option value="MODULE_4">Hazardous Waste</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deadlines List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {deadlinesLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-text-secondary">Loading deadlines...</p>
          </div>
        ) : deadlines.length === 0 ? (
          <NoDeadlinesState filterActive={activeFilter !== 'all' || !!siteFilter || !!moduleFilter} />
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Overdue Section */}
            {groupedDeadlines.overdue.length > 0 && (activeFilter === 'all' || activeFilter === 'overdue') && (
              <>
                <div className="px-6 py-3 bg-danger/5 border-l-4 border-danger">
                  <h3 className="text-sm font-semibold text-danger uppercase tracking-wide">
                    Overdue ({groupedDeadlines.overdue.length})
                  </h3>
                </div>
                {groupedDeadlines.overdue.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </>
            )}

            {/* This Week Section */}
            {groupedDeadlines.thisWeek.length > 0 && (activeFilter === 'all' || activeFilter === 'this-week') && (
              <>
                <div className="px-6 py-3 bg-warning/5 border-l-4 border-warning">
                  <h3 className="text-sm font-semibold text-warning uppercase tracking-wide">
                    This Week ({groupedDeadlines.thisWeek.length})
                  </h3>
                </div>
                {groupedDeadlines.thisWeek.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </>
            )}

            {/* Later Section */}
            {groupedDeadlines.later.length > 0 && (activeFilter === 'all' || activeFilter === 'this-month') && (
              <>
                <div className="px-6 py-3 bg-gray-50 border-l-4 border-gray-300">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                    Upcoming ({groupedDeadlines.later.length})
                  </h3>
                </div>
                {groupedDeadlines.later.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DeadlineRow({ deadline }: { deadline: Deadline }) {
  const router = useRouter();
  const daysRemaining = Math.ceil(
    (new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = deadline.status === 'OVERDUE' || daysRemaining < 0;
  const isDueSoon = !isOverdue && daysRemaining <= 7;

  return (
    <div
      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
      onClick={() => router.push(`/dashboard/sites/${deadline.site_id}/permits/obligations/${deadline.obligation_id}`)}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isOverdue ? 'bg-danger' : isDueSoon ? 'bg-warning' : 'bg-success'
        }`} />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary truncate">
            {deadline.obligations?.title || 'Untitled Obligation'}
          </p>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Building2 className="h-3.5 w-3.5" />
            <span>{deadline.sites?.name || 'Unknown Site'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-lg font-bold ${
            isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-success'
          }`}>
            {isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d`}
          </p>
          <p className="text-xs text-text-tertiary">
            {new Date(deadline.due_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-text-tertiary" />
      </div>
    </div>
  );
}
