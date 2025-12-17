'use client';

/**
 * Reusable CRUD Detail Page Template
 * Generic detail page with tabs, actions, metadata
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface CrudDetailPageProps<T> {
  title: string;
  apiEndpoint: string;
  itemId: string;
  backLink: string;
  editLink?: string;
  onDelete?: () => void;
  tabs?: Array<{
    key: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    content: (item: T) => React.ReactNode;
  }>;
  fields?: Array<{
    key: string;
    label: string;
    render?: (value: any, item: T) => React.ReactNode;
  }>;
}

export function CrudDetailPage<T extends { id: string }>({
  title,
  apiEndpoint,
  itemId,
  backLink,
  editLink,
  onDelete,
  tabs = [],
  fields = [],
}: CrudDetailPageProps<T>) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'details');

  const { data, isLoading, error } = useQuery({
    queryKey: [apiEndpoint, itemId],
    queryFn: async () => {
      return apiClient.get<T>(apiEndpoint + '/' + itemId);
    },
  });

  const item: T | null = (data?.data as T) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Item not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={backLink}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        </div>
        <div className="flex space-x-2">
          {editLink && (
            <Link href={editLink}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {onDelete && (
            <Button variant="outline" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
                >
                  {Icon && <Icon className="inline mr-2 h-4 w-4" />}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {tabs.length > 0 ? (
        <div>
          {tabs.map((tab) => (
            <div key={tab.key} className={activeTab === tab.key ? 'block' : 'hidden'}>
              {tab.content(item)}
            </div>
          ))}
        </div>
      ) : (
        /* Default Details View */
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium text-gray-500">{field.label}</label>
                <div className="mt-1 text-sm text-gray-900">
                  {field.render
                    ? field.render((item as any)[field.key], item)
                    : String((item as any)[field.key] || 'N/A')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
