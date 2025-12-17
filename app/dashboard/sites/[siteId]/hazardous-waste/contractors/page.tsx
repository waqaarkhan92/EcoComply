'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

interface Contractor {
  id: string;
  site_id: string;
  company_name: string;
  licence_number: string;
  licence_type: 'CARRIER' | 'BROKER' | 'DEALER' | 'TREATMENT_FACILITY';
  licence_expiry: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  waste_types_permitted?: string[];
  created_at: string;
}

const statusConfig = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  EXPIRED: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  SUSPENDED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock },
};

const licenceTypeConfig = {
  CARRIER: { label: 'Waste Carrier', bg: 'bg-blue-100', text: 'text-blue-700' },
  BROKER: { label: 'Waste Broker', bg: 'bg-purple-100', text: 'text-purple-700' },
  DEALER: { label: 'Waste Dealer', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  TREATMENT_FACILITY: { label: 'Treatment Facility', bg: 'bg-teal-100', text: 'text-teal-700' },
};

export default function ContractorsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: siteData } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data as { name: string; [key: string]: unknown };
    },
    enabled: !!siteId,
  });

  const { data: contractorsData, isLoading } = useQuery({
    queryKey: ['contractors', siteId, statusFilter, typeFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('siteId', siteId);
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        queryParams.append('licenceType', typeFilter);
      }
      const response = await apiClient.get(`/module-4/contractor-licences?${queryParams.toString()}`);
      return response as { data: Contractor[] };
    },
    enabled: !!siteId,
  });

  const contractors: any[] = contractorsData?.data || [];
  const activeCount = contractors.filter(c => c.status === 'ACTIVE').length;
  const expiringCount = contractors.filter(c => {
    if (c.status !== 'ACTIVE') return false;
    const expiryDate = new Date(c.licence_expiry);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: siteData?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'Contractors' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">Waste Contractors</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Manage licensed waste carriers, brokers, and facilities
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/hazardous-waste/contractors/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Contractor
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Building2 className="h-5 w-5" />
            <span className="text-sm">Total Contractors</span>
          </div>
          <p className="text-2xl font-bold">{contractors.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">Active Licences</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm">Expiring Soon</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{expiringCount}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Expired</span>
          </div>
          <p className="text-2xl font-bold text-red-700">
            {contractors.filter(c => c.status === 'EXPIRED').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 self-center">Status:</span>
          {['all', 'ACTIVE', 'EXPIRED', 'SUSPENDED'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 self-center">Type:</span>
          {['all', 'CARRIER', 'BROKER', 'TREATMENT_FACILITY'].map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All' : licenceTypeConfig[type as keyof typeof licenceTypeConfig]?.label || type}
            </Button>
          ))}
        </div>
      </div>

      {/* Contractors List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : contractors.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ShieldCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contractors found</h3>
          <p className="text-gray-500 mb-4">
            Add licensed waste contractors to manage your waste transfers.
          </p>
          <Link href={`/dashboard/sites/${siteId}/hazardous-waste/contractors/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contractor
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contractors.map((contractor) => {
            const StatusIcon = statusConfig[contractor.status as keyof typeof statusConfig]?.icon || CheckCircle;
            const isExpiringSoon = contractor.status === 'ACTIVE' && (() => {
              const expiryDate = new Date(contractor.licence_expiry);
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
              return expiryDate <= thirtyDaysFromNow;
            })();

            return (
              <div
                key={contractor.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{contractor.company_name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{contractor.licence_number}</p>
                  </div>
                  <Badge className={`${statusConfig[contractor.status as keyof typeof statusConfig]?.bg} ${statusConfig[contractor.status as keyof typeof statusConfig]?.text}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {contractor.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={`${licenceTypeConfig[contractor.licence_type as keyof typeof licenceTypeConfig]?.bg} ${licenceTypeConfig[contractor.licence_type as keyof typeof licenceTypeConfig]?.text}`}>
                    {licenceTypeConfig[contractor.licence_type as keyof typeof licenceTypeConfig]?.label}
                  </Badge>
                  {isExpiringSoon && (
                    <Badge className="bg-orange-100 text-orange-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Expiring Soon
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Expires: {new Date(contractor.licence_expiry).toLocaleDateString()}</span>
                  </div>
                  {contractor.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{contractor.contact_email}</span>
                    </div>
                  )}
                  {contractor.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{contractor.contact_phone}</span>
                    </div>
                  )}
                </div>

                <Link href={`/dashboard/sites/${siteId}/hazardous-waste/contractors/${contractor.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
