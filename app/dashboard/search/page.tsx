'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Search, FileText, CheckCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

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

  const { data: searchData, isLoading } = useQuery<SearchResponse>({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return { data: [] };
      return apiClient.get<SearchResponse>(`/search?q=${encodeURIComponent(searchTerm)}`);
    },
    enabled: searchTerm.length > 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  const results = searchData?.data || [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-gray-600 mt-1">Search across all your compliance data</p>
      </div>

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

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Searching...</div>
        </div>
      )}

      {searchTerm && !isLoading && (
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

