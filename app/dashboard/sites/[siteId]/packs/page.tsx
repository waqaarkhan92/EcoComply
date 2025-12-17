'use client';

/**
 * Site Packs List Page
 * Lists all audit packs for a specific site
 */

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export default function SitePacksPage() {
  const params = useParams();
  const siteId = params?.siteId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['site-packs', siteId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/packs?filter[site_id]=${siteId}`);
    },
    enabled: !!siteId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading packs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading packs. Please try again.</p>
        </div>
      </div>
    );
  }

  const packs: any[] = data?.data || [];

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sites', href: '/dashboard/sites' },
    { label: 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
    { label: 'Audit Packs' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbItems} className="mb-6" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audit Packs</h1>
        <Link
          href={`/dashboard/sites/${siteId}/packs/generate`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Pack
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No packs found for this site.</p>
          <Link
            href={`/dashboard/sites/${siteId}/packs/generate`}
            className="text-blue-600 hover:underline"
          >
            Generate your first pack
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {packs.map((pack: any) => (
            <Link
              key={pack.id}
              href={`/dashboard/sites/${siteId}/packs/${pack.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{pack.pack_type || 'Audit Pack'}</h3>
                  <p className="text-sm text-gray-600">
                    Status: {pack.status || 'PENDING'}
                  </p>
                  {pack.date_range_start && pack.date_range_end && (
                    <p className="text-sm text-gray-500">
                      {new Date(pack.date_range_start).toLocaleDateString()} -{' '}
                      {new Date(pack.date_range_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-sm ${
                    pack.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    pack.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {pack.status || 'PENDING'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

