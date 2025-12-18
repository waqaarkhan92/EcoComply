'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button, ButtonProps } from './button';
import { Download, FileSpreadsheet, FileText, FileJson, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

interface ExportConfig {
  /** Data to export */
  data: Record<string, unknown>[];
  /** Filename without extension */
  filename: string;
  /** Column headers mapping (key -> display name) */
  columns?: Record<string, string>;
  /** Title for PDF export */
  title?: string;
}

interface ExportButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Export configuration */
  config: ExportConfig;
  /** Available export formats */
  formats?: ExportFormat[];
  /** Called before export starts */
  onExportStart?: (format: ExportFormat) => void;
  /** Called after export completes */
  onExportComplete?: (format: ExportFormat) => void;
  /** Called on export error */
  onExportError?: (format: ExportFormat, error: Error) => void;
}

const formatIcons: Record<ExportFormat, typeof Download> = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  json: FileJson,
  pdf: FileText,
};

const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel',
  json: 'JSON',
  pdf: 'PDF',
};

/**
 * Convert data to CSV format
 */
function toCSV(data: Record<string, unknown>[], columns?: Record<string, string>): string {
  if (data.length === 0) return '';

  const keys = columns ? Object.keys(columns) : Object.keys(data[0]);
  const headers = columns ? Object.values(columns) : keys;

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) => keys.map((key) => escapeCSV(row[key])).join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download a file
 */
function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportButton({
  config,
  formats = ['csv', 'xlsx', 'json'],
  onExportStart,
  onExportComplete,
  onExportError,
  children,
  ...buttonProps
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (config.data.length === 0) {
        toast.error('No data to export');
        return;
      }

      setIsExporting(true);
      onExportStart?.(format);

      try {
        const timestamp = new Date().toISOString().split('T')[0];
        const baseFilename = `${config.filename}_${timestamp}`;

        switch (format) {
          case 'csv': {
            const csv = toCSV(config.data, config.columns);
            downloadFile(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
            break;
          }

          case 'xlsx': {
            // For Excel, we use CSV as a simple fallback (proper xlsx requires a library)
            // In production, you'd use a library like xlsx or exceljs
            const csv = toCSV(config.data, config.columns);
            downloadFile(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
            toast.info('Exported as CSV (Excel compatible)');
            break;
          }

          case 'json': {
            const json = JSON.stringify(config.data, null, 2);
            downloadFile(json, `${baseFilename}.json`, 'application/json');
            break;
          }

          case 'pdf': {
            // PDF export would require a library like jspdf
            // For now, we'll show a message
            toast.error('PDF export requires server-side generation');
            return;
          }
        }

        toast.success(`Exported ${config.data.length} records as ${formatLabels[format]}`);
        onExportComplete?.(format);
      } catch (error) {
        console.error('Export error:', error);
        toast.error(`Failed to export as ${formatLabels[format]}`);
        onExportError?.(format, error as Error);
      } finally {
        setIsExporting(false);
        setShowDropdown(false);
      }
    },
    [config, onExportStart, onExportComplete, onExportError]
  );

  // Single format - direct button
  if (formats.length === 1) {
    const format = formats[0];
    const Icon = formatIcons[format];
    return (
      <Button
        {...buttonProps}
        onClick={() => handleExport(format)}
        loading={isExporting}
        icon={<Icon className="w-4 h-4" />}
      >
        {children || `Export ${formatLabels[format]}`}
      </Button>
    );
  }

  // Multiple formats - dropdown menu
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        {...buttonProps}
        loading={isExporting}
        icon={<Download className="w-4 h-4" />}
        iconPosition="left"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {children || 'Export'}
        <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", showDropdown && "rotate-180")} />
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <ul className="py-1">
            {formats.map((format) => {
              const Icon = formatIcons[format];
              return (
                <li key={format}>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => handleExport(format)}
                  >
                    <Icon className="w-4 h-4" />
                    {formatLabels[format]}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing export state
 */
export function useExport<T extends Record<string, unknown>>() {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(
    async (
      data: T[],
      filename: string,
      format: ExportFormat,
      columns?: Record<string, string>
    ) => {
      if (data.length === 0) {
        toast.error('No data to export');
        return false;
      }

      setIsExporting(true);

      try {
        const timestamp = new Date().toISOString().split('T')[0];
        const baseFilename = `${filename}_${timestamp}`;

        switch (format) {
          case 'csv':
          case 'xlsx': {
            const csv = toCSV(data, columns);
            downloadFile(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
            break;
          }

          case 'json': {
            const json = JSON.stringify(data, null, 2);
            downloadFile(json, `${baseFilename}.json`, 'application/json');
            break;
          }

          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        toast.success(`Exported ${data.length} records`);
        return true;
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Failed to export data');
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { isExporting, exportData };
}
