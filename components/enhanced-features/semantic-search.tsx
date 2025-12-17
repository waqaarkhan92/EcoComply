'use client';

/**
 * Semantic Search Component
 * Natural language search with AI embeddings
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Sparkles, X, FileText, ClipboardList, MapPin, FileCheck, Loader2 } from 'lucide-react';
import { useSemanticSearch, SemanticSearchResult } from '@/lib/hooks/use-enhanced-features';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface SemanticSearchProps {
  onSelect?: (result: SemanticSearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const entityTypeConfig = {
  obligation: { icon: ClipboardList, label: 'Obligation', color: 'bg-blue-100 text-blue-700', href: '/dashboard/obligations' },
  document: { icon: FileText, label: 'Document', color: 'bg-purple-100 text-purple-700', href: '/dashboard/documents' },
  evidence: { icon: FileCheck, label: 'Evidence', color: 'bg-green-100 text-green-700', href: '/dashboard/evidence' },
  site: { icon: MapPin, label: 'Site', color: 'bg-orange-100 text-orange-700', href: '/dashboard/sites' },
};

export function SemanticSearch({ onSelect, placeholder = 'Search using natural language...', autoFocus = false }: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const { data: searchData, isLoading, isFetching } = useSemanticSearch(debouncedQuery);
  const results = searchData?.results || [];

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (result: SemanticSearchResult) => {
    if (onSelect) {
      onSelect(result);
    }
    setIsOpen(false);
    setQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when query has results
  useEffect(() => {
    if (query.length >= 3 && results.length > 0) {
      setIsOpen(true);
      setSelectedIndex(0);
    } else if (query.length < 3) {
      setIsOpen(false);
    }
  }, [query, results]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 3 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {(isLoading || isFetching) && query.length >= 3 && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* AI indicator */}
      <div className="absolute -top-6 right-0 flex items-center gap-1 text-xs text-gray-400">
        <Sparkles className="w-3 h-3" />
        AI-powered search
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
        >
          {results.length === 0 && query.length >= 3 && !isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or phrases</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <SearchResultItem
                  key={`${result.entity_type}-${result.entity_id}`}
                  result={result}
                  isSelected={index === selectedIndex}
                  onSelect={() => handleSelect(result)}
                  onHover={() => setSelectedIndex(index)}
                />
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Use ↑↓ to navigate, Enter to select</span>
              <span>{results.length} results</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SearchResultItemProps {
  result: SemanticSearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function SearchResultItem({ result, isSelected, onSelect, onHover }: SearchResultItemProps) {
  const config = entityTypeConfig[result.entity_type as keyof typeof entityTypeConfig];
  const Icon = config?.icon || FileText;
  const href = config ? `${config.href}/${result.entity_id}` : '#';

  const relevancePercent = Math.round(result.similarity_score * 100);

  return (
    <Link
      href={href}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`block px-4 py-3 transition-colors ${
        isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{result.title}</span>
            <Badge variant="default" className="text-xs">
              {config?.label || result.entity_type}
            </Badge>
          </div>

          {result.content_preview && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {result.content_preview}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${relevancePercent}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{relevancePercent}% match</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default SemanticSearch;
