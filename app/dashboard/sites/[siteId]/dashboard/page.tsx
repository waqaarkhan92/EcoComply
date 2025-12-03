'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  FileText, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  MoreVertical,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import UnlinkedEvidenceWidget from '@/components/dashboard/UnlinkedEvidenceWidget';

interface Site {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  postcode: string;
  regulator: string;
  compliance_score: number;
  compliance_status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

interface Obligation {
  id: string;
  title: string;
  category: string;
  due_date: string;
  status: string;
  is_overdue: boolean;
}

interface Deadline {
  id: string;
  obligation_id: string;
  obligation_title: string;
  due_date: string;
  status: string;
  days_remaining: number;
}

interface DashboardData {
  site: Site;
  overdue_obligations: Obligation[];
  upcoming_deadlines: Deadline[];
  recent_activity: any[];
  compliance_score: number;
}

export default function SiteDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const { data: dashboardData, isLoading, error } = useQuery<{ data: DashboardData }>({
    queryKey: ['site-dashboard', siteId],
    queryFn: async (): Promise<any> => {
      // Try to fetch from dedicated endpoint, fallback to aggregated calls
      try {
        const response = await apiClient.get<{ data: DashboardData }>(`/sites/${siteId}/dashboard`);
        return response;
      } catch {
        // Fallback: fetch individual endpoints
        const [siteRes, obligationsRes, deadlinesRes] = await Promise.all([
          apiClient.get<{ data: Site }>(`/sites/${siteId}`),
          apiClient.get<{ data: Obligation[] }>(`/sites/${siteId}/obligations?filter[status]=OVERDUE&limit=10`),
          apiClient.get<{ data: Deadline[] }>(`/sites/${siteId}/deadlines/upcoming?days=7&limit=10`),
        ]);

        return {
          data: {
            site: siteRes.data,
            overdue_obligations: obligationsRes.data || [],
            upcoming_deadlines: deadlinesRes.data || [],
            recent_activity: [],
            compliance_score: siteRes.data.compliance_score || 0,
          },
        };
      }
    },
    enabled: !!siteId,
  });

  const getTrafficLightStatus = (status?: string, score?: number) => {
    if (status === 'COMPLIANT' || (score && score >= 85)) return 'GREEN';
    if (status === 'AT_RISK' || (score && score >= 70 && score < 85)) return 'YELLOW';
    return 'RED';
  };

  const getStatusColor = (status: string) => {
    if (status === 'GREEN') return { bg: 'bg-green-500', text: 'text-green-900' };
    if (status === 'YELLOW') return { bg: 'bg-yellow-500', text: 'text-yellow-900' };
    return { bg: 'bg-red-500', text: 'text-red-900' };
  };

  const getStatusMessage = (status: string, score: number) => {
    if (status === 'GREEN') return 'All obligations are compliant';
    if (status === 'YELLOW') return 'Some obligations require attention';
    return 'Critical compliance issues require immediate action';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#101314] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 bg-gray-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData?.data) {
    return (
      <div className="min-h-screen bg-[#101314] flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-4">Unable to load site dashboard data</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const { site, overdue_obligations = [], upcoming_deadlines = [], compliance_score = 0 } = dashboardData.data;
  const trafficLightStatus = getTrafficLightStatus(site.compliance_status, compliance_score);
  const statusColors = getStatusColor(trafficLightStatus);

  return (
    <div className="min-h-screen bg-[#101314] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Site Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{site.name}</h1>
            <p className="text-gray-400">
              {site.address_line_1}, {site.city}, {site.postcode}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/sites/${siteId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Traffic Light Status */}
        <div className={`bg-white rounded-lg shadow-lg p-6 ${statusColors.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-6 h-6 rounded-full ${statusColors.bg}`} />
                <h2 className="text-xl font-semibold text-[#101314]">
                  {trafficLightStatus === 'GREEN' ? 'Compliant' : trafficLightStatus === 'YELLOW' ? 'At Risk' : 'Non-Compliant'}
                </h2>
              </div>
              <p className="text-[#101314] opacity-80">
                {getStatusMessage(trafficLightStatus, compliance_score)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-[#101314]">{compliance_score}%</div>
              <p className="text-sm text-[#101314] opacity-80">Compliance Score</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Obligations Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#101314]">Overdue Obligations</h3>
              <span className="text-3xl font-bold text-[#B13434]">{overdue_obligations.length}</span>
            </div>
            {overdue_obligations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No overdue obligations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Obligation</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue_obligations.slice(0, 5).map((obligation) => (
                      <tr key={obligation.id} className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/sites/${siteId}/obligations/${obligation.id}`)}>
                        <td className="py-3 text-sm font-medium">{obligation.title}</td>
                        <td className="py-3 text-sm text-gray-600">{obligation.category}</td>
                        <td className="py-3 text-sm text-red-600">
                          {new Date(obligation.due_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {overdue_obligations.length > 5 && (
                  <div className="mt-4 text-center">
                    <Link href={`/dashboard/sites/${siteId}/obligations?filter=overdue`}>
                      <Button variant="outline" size="sm">
                        View All ({overdue_obligations.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#101314]">Upcoming Deadlines</h3>
              <span className="text-3xl font-bold text-[#CB7C00]">{upcoming_deadlines.length}</span>
            </div>
            {upcoming_deadlines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No upcoming deadlines</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Obligation</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Due Date</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming_deadlines.slice(0, 5).map((deadline) => (
                      <tr key={deadline.id} className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/sites/${siteId}/deadlines/${deadline.id}`)}>
                        <td className="py-3 text-sm font-medium">{deadline.obligation_title}</td>
                        <td className="py-3 text-sm text-gray-600">
                          {new Date(deadline.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            deadline.days_remaining <= 3 ? 'bg-red-100 text-red-800' :
                            deadline.days_remaining <= 7 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {deadline.days_remaining} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {upcoming_deadlines.length > 5 && (
                  <div className="mt-4 text-center">
                    <Link href={`/dashboard/sites/${siteId}/deadlines/upcoming`}>
                      <Button variant="outline" size="sm">
                        View All ({upcoming_deadlines.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-[#101314] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href={`/dashboard/sites/${siteId}/documents/upload`} className="block">
                <Button className="w-full justify-start" style={{ backgroundColor: '#026A67' }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
              <Link href={`/dashboard/evidence/upload?siteId=${siteId}`} className="block">
                <Button className="w-full justify-start" style={{ backgroundColor: '#026A67' }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Evidence
                </Button>
              </Link>
              <Link href={`/dashboard/sites/${siteId}/packs/generate`} className="block">
                <Button className="w-full justify-start" style={{ backgroundColor: '#026A67' }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Audit Pack
                </Button>
              </Link>
            </div>
          </div>

          {/* Unlinked Evidence Widget */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <UnlinkedEvidenceWidget siteId={siteId} />
          </div>
        </div>
      </div>
    </div>
  );
}

