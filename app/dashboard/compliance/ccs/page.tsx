'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Plus,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import type { CcsAssessment, ComplianceBand } from '@/lib/types/regulatory';

interface CcsAssessmentWithSite extends CcsAssessment {
  site?: {
    id: string;
    name: string;
  };
}

const BAND_COLORS: Record<ComplianceBand, { bg: string; text: string }> = {
  A: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  B: { bg: 'bg-green-500/10', text: 'text-green-500' },
  C: { bg: 'bg-lime-500/10', text: 'text-lime-500' },
  D: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  E: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  F: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

export default function CcsAssessmentsPage() {
  const { company } = useAuthStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['ccs-assessments', company?.id, selectedYear],
    queryFn: async () => {
      const response = await apiClient.get<CcsAssessmentWithSite[]>(
        `/regulatory/ccs/assessments?companyId=${company?.id}&year=${selectedYear}`
      );
      return response as { data: CcsAssessmentWithSite[] };
    },
    enabled: !!company?.id,
  });

  const assessments: any[] = assessmentsData?.data || [];

  // Group by site
  const assessmentsBySite = assessments.reduce((acc, assessment) => {
    const siteId = assessment.site_id;
    if (!acc[siteId]) {
      acc[siteId] = {
        siteName: assessment.site?.name || 'Unknown Site',
        assessments: [],
      };
    }
    acc[siteId].assessments.push(assessment);
    return acc;
  }, {} as Record<string, { siteName: string; assessments: CcsAssessmentWithSite[] }>);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-primary">CCS Assessments</h1>
          </div>
          <p className="text-text-secondary mt-2">
            Environment Agency Compliance Classification Scheme assessments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            iconPosition="left"
          >
            Record Assessment
          </Button>
        </div>
      </div>

      {/* Band Legend */}
      <div className="bg-white rounded-lg shadow-base p-4">
        <h3 className="text-sm font-medium text-text-primary mb-3">EA Compliance Bands</h3>
        <div className="flex flex-wrap gap-4">
          {(['A', 'B', 'C', 'D', 'E', 'F'] as ComplianceBand[]).map(band => (
            <div key={band} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${BAND_COLORS[band].bg} flex items-center justify-center`}>
                <span className={`font-bold ${BAND_COLORS[band].text}`}>{band}</span>
              </div>
              <span className="text-sm text-text-secondary">
                {band === 'A' && '0 points - Excellent'}
                {band === 'B' && '1-30 points - Good'}
                {band === 'C' && '31-60 points - Fair'}
                {band === 'D' && '61-100 points - Poor'}
                {band === 'E' && '101-150 points - Very Poor'}
                {band === 'F' && '>150 points - Unacceptable'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Assessments List */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <p className="text-text-secondary">Loading assessments...</p>
        </div>
      ) : Object.keys(assessmentsBySite).length === 0 ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary mb-4">No CCS assessments recorded for {selectedYear}</p>
          <Button variant="primary" size="md">
            Record First Assessment
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(assessmentsBySite).map(([siteId, value]) => {
            const { siteName, assessments } = value as { siteName: string; assessments: CcsAssessmentWithSite[] };
            return (
            <div key={siteId} className="bg-white rounded-lg shadow-base overflow-hidden">
              {/* Site Header */}
              <div className="px-6 py-4 border-b border-input-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-text-primary">{siteName}</h3>
                </div>
                <Link
                  href={`/dashboard/sites/${siteId}/compliance/ccs`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View Site Details <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Assessments Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background-tertiary">
                      <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Band</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Score</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Assessment Date</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Assessed By</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">CAR Reference</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map(assessment => (
                      <tr key={assessment.id} className="border-b border-input-border/50 hover:bg-background-tertiary/50">
                        <td className="py-4 px-6">
                          {assessment.compliance_band ? (
                            <div className={`w-10 h-10 rounded-lg ${BAND_COLORS[assessment.compliance_band].bg} flex items-center justify-center`}>
                              <span className={`text-xl font-bold ${BAND_COLORS[assessment.compliance_band].text}`}>
                                {assessment.compliance_band}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-lg font-bold text-text-primary">
                            {assessment.total_score}
                          </span>
                          <span className="text-text-secondary ml-1">points</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-text-primary">
                            <Calendar className="h-4 w-4 text-text-tertiary" />
                            {new Date(assessment.assessment_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-text-secondary">
                            {assessment.assessed_by === 'EA_OFFICER' && 'EA Officer'}
                            {assessment.assessed_by === 'SELF_ASSESSMENT' && 'Self Assessment'}
                            {assessment.assessed_by === 'THIRD_PARTY_AUDITOR' && 'Third Party'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {assessment.car_reference ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-text-tertiary" />
                              <span className="text-sm text-text-primary">{assessment.car_reference}</span>
                            </div>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/compliance/ccs/${assessment.id}`}
                            className="text-primary hover:underline text-sm"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
