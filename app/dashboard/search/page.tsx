'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { Search, FileText, CheckCircle, Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SemanticSearch } from '@/components/enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveRegion } from '@/components/ui/live-region';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
}

interface SearchResponse {
  data: SearchResult[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'standard' | 'semantic'>('standard');

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async (): Promise<any> => {
      if (!searchTerm) return { data: [] };
      return apiClient.get<SearchResponse>(`/search?q=${encodeURIComponent(searchTerm)}`);
    },
    enabled: searchTerm.length > 2 && searchMode === 'standard',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  const results: any[] = searchData?.data || [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'obligation':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'site':
        return <Building2 className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Search' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <PageHeader
        title="Search"
        description="Search across all your compliance data"
      />

      {/* Search Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchMode('standard')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchMode === 'standard'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Standard Search
        </button>
        <button
          onClick={() => setSearchMode('semantic')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchMode === 'semantic'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          AI Semantic Search
        </button>
      </div>

      {/* Semantic Search Mode */}
      {searchMode === 'semantic' ? (
        <SemanticSearch
          placeholder="Ask a question or describe what you're looking for..."
          onSelect={(result) => {
            // Navigate to the selected result
            window.location.href = `/dashboard/${result.entity_type}s/${result.entity_id}`;
          }}
        />
      ) : (
        /* Standard Search Mode */
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-6">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, obligations, sites..."
                className="pl-10"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>
      )}

      {isLoading && searchMode === 'standard' && (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          <div className="p-6 border-b border-gray-200">
            <Skeleton className="h-6 w-48" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-16 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screen reader announcement for search results */}
      <LiveRegion
        message={
          isLoading
            ? 'Searching...'
            : searchTerm && searchMode === 'standard'
              ? `${results.length} result${results.length !== 1 ? 's' : ''} found for "${searchTerm}"`
              : ''
        }
      />

      {searchTerm && !isLoading && searchMode === 'standard' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{searchTerm}"
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No results found. Try a different search term.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={result.url}
                  className="block p-6 hover:bg-gray-50"
                >
                  <div className="flex items-start space-x-4">
                    {getIcon(result.type)}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{result.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                      <span className="mt-2 inline-block text-xs text-gray-500 uppercase">
                        {result.type}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

