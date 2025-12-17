'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import Link from 'next/link';

interface ReportGeneration {
  report_type: string;
  date_range_start: string;
  date_range_end: string;
  site_id?: string;
  format: 'PDF' | 'CSV' | 'EXCEL';
}

export default function GenerateReportPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<string>('compliance-summary');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [format, setFormat] = useState<'PDF' | 'CSV' | 'EXCEL'>('PDF');

  const generateReport = useMutation({
    mutationFn: async (data: ReportGeneration) => {
      return apiClient.post('/reports/generate', data);
    },
    onSuccess: (response: any) => {
      const reportUrl = response.data?.download_url;
      if (reportUrl) {
        window.open(reportUrl, '_blank');
      } else {
        toast.success('Report generated successfully!');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please select a date range');
      return;
    }
    generateReport.mutate({
      report_type: reportType,
      date_range_start: startDate,
      date_range_end: endDate,
      site_id: siteId || undefined,
      format,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/reports"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Reports
          </Link>
          <h1 className="text-2xl font-bold">Generate Report</h1>
          <p className="text-gray-600 mt-1">Create a custom compliance report</p>
        </div>
      </div>

      {/* Report Generation Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="report_type">Report Type</Label>
          <select
            id="report_type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="compliance-summary">Compliance Summary</option>
            <option value="deadline-report">Deadline Report</option>
            <option value="obligation-status">Obligation Status</option>
            <option value="trend-analysis">Trend Analysis</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_range_start">Start Date</Label>
            <Input
              id="date_range_start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="date_range_end">End Date</Label>
            <Input
              id="date_range_end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="site_id">Site (Optional)</Label>
          <Input
            id="site_id"
            type="text"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="mt-1"
            placeholder="Leave empty for all sites"
          />
        </div>

        <div>
          <Label htmlFor="format">Format</Label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'PDF' | 'CSV' | 'EXCEL')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="PDF">PDF</option>
            <option value="CSV">CSV</option>
            <option value="EXCEL">Excel</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/dashboard/reports">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={generateReport.isPending} style={{ backgroundColor: '#026A67' }}>
            <Download className="h-4 w-4 mr-2" />
            {generateReport.isPending ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </form>
    </div>
  );
}

