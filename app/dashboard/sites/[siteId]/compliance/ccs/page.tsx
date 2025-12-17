'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Shield,
  Plus,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import Link from 'next/link';

interface CcsAssessment {
  id: string;
  site_id: string;
  assessment_year: number;
  compliance_band: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  score: number;
  assessment_date: string;
  next_assessment_due?: string;
  status: string;
  notes?: string;
}

const BAND_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Excellent' },
  B: { bg: 'bg-green-100', text: 'text-green-700', label: 'Good' },
  C: { bg: 'bg-lime-100', text: 'text-lime-700', label: 'Satisfactory' },
  D: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Needs Improvement' },
  E: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Poor' },
  F: { bg: 'bg-red-100', text: 'text-red-700', label: 'Unacceptable' },
};

export default function SiteCcsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: siteData } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data as { name: string; [key: string]: unknown };
    },
    enabled: !!siteId,
  });

  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['site-ccs-assessments', siteId, selectedYear],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CcsAssessment[] }>(
        `/regulatory/ccs/assessments?siteId=${siteId}&year=${selectedYear}`
      );
      return response.data;
    },
    enabled: !!siteId,
  });

  const assessments: CcsAssessment[] = (assessmentsData as any)?.data || [];
  const latestAssessment = assessments[0];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: (siteData as any)?.name || 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'CCS Assessment' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">CCS Assessment</h1>
          </div>
          <p className="text-text-secondary mt-1">
            Environment Agency Compliance Classification Scheme
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/compliance/ccs/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Current Status Card */}
      {latestAssessment && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Current Compliance Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${BAND_COLORS[latestAssessment.compliance_band]?.bg || 'bg-gray-100'}`}>
                <span className={`text-3xl font-bold ${BAND_COLORS[latestAssessment.compliance_band]?.text || 'text-gray-700'}`}>
                  {latestAssessment.compliance_band}
                </span>
              </div>
              <p className="mt-2 font-medium">{BAND_COLORS[latestAssessment.compliance_band]?.label}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-2xl font-bold">{latestAssessment.score}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Assessment Date</p>
              <p className="text-lg font-medium">
                {new Date(latestAssessment.assessment_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Due</p>
              <p className="text-lg font-medium">
                {latestAssessment.next_assessment_due
                  ? new Date(latestAssessment.next_assessment_due).toLocaleDateString()
                  : 'Not scheduled'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Year Filter */}
      <div className="flex gap-2">
        {years.map((year) => (
          <Button
            key={year}
            variant={selectedYear === year ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </Button>
        ))}
      </div>

      {/* Assessment History */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : assessments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
          <p className="text-gray-500 mb-4">
            Create your first CCS assessment for this site.
          </p>
          <Link href={`/dashboard/sites/${siteId}/compliance/ccs/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Band</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{assessment.assessment_year}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BAND_COLORS[assessment.compliance_band]?.bg || 'bg-gray-100'} ${BAND_COLORS[assessment.compliance_band]?.text || 'text-gray-700'}`}>
                      Band {assessment.compliance_band}
                    </span>
                  </td>
                  <td className="px-6 py-4">{assessment.score}%</td>
                  <td className="px-6 py-4">{new Date(assessment.assessment_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-sm ${
                      assessment.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {assessment.status === 'COMPLETED' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {assessment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
