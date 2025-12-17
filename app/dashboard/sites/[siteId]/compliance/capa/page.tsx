'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface CapaItem {
  id: string;
  site_id: string;
  title: string;
  description: string;
  source: 'AUDIT' | 'INCIDENT' | 'INSPECTION' | 'SELF_IDENTIFIED' | 'REGULATOR';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED';
  due_date: string;
  assigned_to?: string;
  created_at: string;
  closed_at?: string;
}

const priorityConfig = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
};

const statusConfig = {
  OPEN: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  PENDING_VERIFICATION: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  CLOSED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
};

export default function SiteCapaPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: siteData } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data as { data: { id: string; name: string } };
    },
    enabled: !!siteId,
  });

  const { data: capaData, isLoading } = useQuery({
    queryKey: ['site-capa', siteId, statusFilter],
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      urlParams.append('siteId', siteId);
      if (statusFilter !== 'all') {
        urlParams.append('status', statusFilter);
      }
      const response = await apiClient.get(`/regulatory/capa?${urlParams.toString()}`);
      return response as { data: CapaItem[] };
    },
    enabled: !!siteId,
  });

  const items: CapaItem[] = (capaData as any)?.data || [];
  const openCount = items.filter((i: CapaItem) => i.status === 'OPEN').length;
  const inProgressCount = items.filter((i: CapaItem) => i.status === 'IN_PROGRESS').length;
  const overdueCount = items.filter((i: CapaItem) =>
    i.status !== 'CLOSED' && new Date(i.due_date) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: (siteData as any)?.data?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'CAPA Tracker' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">CAPA Tracker</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Corrective and Preventive Actions
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/compliance/capa/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New CAPA
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <FileText className="h-5 w-5" />
            <span className="text-sm">Total Items</span>
          </div>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Open</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{openCount}</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{inProgressCount}</p>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'CLOSED'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* CAPA List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No CAPA items found</h3>
          <p className="text-gray-500 mb-4">
            {statusFilter === 'all'
              ? 'Create corrective actions to track compliance improvements.'
              : 'No items match the selected filter.'}
          </p>
          <Link href={`/dashboard/sites/${siteId}/compliance/capa/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New CAPA
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const StatusIcon = statusConfig[item.status]?.icon || Clock;
            const isOverdue = item.status !== 'CLOSED' && new Date(item.due_date) < new Date();

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${priorityConfig[item.priority]?.bg} ${priorityConfig[item.priority]?.text}`}>
                        {item.priority}
                      </Badge>
                      <Badge className={`${statusConfig[item.status]?.bg} ${statusConfig[item.status]?.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="default">{item.source}</Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                        <Calendar className="h-4 w-4" />
                        Due: {new Date(item.due_date).toLocaleDateString()}
                        {isOverdue && ' (Overdue)'}
                      </span>
                      {item.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {item.assigned_to}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/sites/${siteId}/compliance/capa/${item.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
