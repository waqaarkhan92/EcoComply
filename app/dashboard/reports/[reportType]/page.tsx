'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface ReportData {
  report_type: string;
  generated_at: string;
  data: any;
}

export default function ReportDetailPage() {
  const params = useParams();
  const reportType = params.reportType as string;

  const { data: reportData, isLoading } = useQuery<{ data: ReportData }>({
    queryKey: ['report', reportType],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: ReportData }>(`/reports/${reportType}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Generating report...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Report</h1>
            <p className="text-gray-600 mt-1">{reportType.replace(/-/g, ' ')}</p>
          </div>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {reportData?.data ? (
          <div>
            <div className="mb-4 text-sm text-gray-500">
              Generated: {new Date(reportData.data.generated_at).toLocaleString()}
            </div>
            <div className="prose max-w-none">
              {/* Report content would be rendered here */}
              <pre className="bg-gray-50 p-4 rounded">
                {JSON.stringify(reportData.data.data, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            No report data available
          </div>
        )}
      </div>
    </div>
  );
}

