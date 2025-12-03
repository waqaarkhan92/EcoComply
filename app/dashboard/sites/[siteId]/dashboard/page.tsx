'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Building2,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Upload,
  Package,
  TrendingUp,
  ArrowRight,
  Beaker,
  Zap,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SiteDashboardProps {
  params: Promise<{ siteId: string }>;
}

interface Site {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  postcode: string;
  regulator: string;
  water_company: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

interface DashboardStats {
  obligations: {
    total: number;
    overdue: number;
    due_soon: number;
    compliant: number;
  };
  documents: {
    total: number;
    pending_review: number;
    approved: number;
  };
  upcoming_deadlines: Array<{
    id: string;
    obligation_id: string;
    obligation_title: string;
    due_date: string;
    status: string;
  }>;
}

export default function SiteDashboardPage({ params }: SiteDashboardProps) {
  const { siteId } = use(params);
  const router = useRouter();

  const { data: siteData, isLoading: isSiteLoading } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(\`/sites/\${siteId}\`);
      return response.data as Site;
    },
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['site-dashboard-stats', siteId],
    queryFn: async () => {
      const response = await apiClient.get(\`/sites/\${siteId}/dashboard\`);
      return response.data as DashboardStats;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const [module2, module3, module4] = await Promise.all([
        apiClient.get('/modules?filter[module_code]=MODULE_2'),
        apiClient.get('/modules?filter[module_code]=MODULE_3'),
        apiClient.get('/modules?filter[module_code]=MODULE_4'),
      ]);
      return {
        module2: module2.data?.[0],
        module3: module3.data?.[0],
        module4: module4.data?.[0],
      };
    },
  });

  const site = siteData;
  const stats = statsData;

  const getStatusColor = (status: string | undefined, score: number | undefined) => {
    if (!status && !score) return '#6B7280';
    if (status === 'COMPLIANT' || (score && score >= 85)) return '#2E7D32';
    if (status === 'AT_RISK' || (score && score >= 70 && score < 85)) return '#D4A017';
    return '#C44536';
  };

  const getStatusText = (status: string | undefined, score: number | undefined) => {
    if (!status && !score) return 'Unknown';
    if (status === 'COMPLIANT' || (score && score >= 85)) return 'Compliant';
    if (status === 'AT_RISK' || (score && score >= 70 && score < 85)) return 'At Risk';
    return 'Non-Compliant';
  };

  if (isSiteLoading || isStatsLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-white rounded-lg shadow animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(site?.compliance_status, site?.compliance_score);
  const score = site?.compliance_score || 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4" style={{ borderLeftColor: statusColor }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-[#104B3A]" />
                <h1 className="text-4xl font-bold text-[#101314]">{site?.name}</h1>
              </div>
              <p className="text-gray-600">
                {site?.address_line_1}, {site?.city}, {site?.postcode}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">Compliance Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold" style={{ color: statusColor }}>
                  {score}
                </span>
                <span className="text-3xl font-medium text-gray-400">%</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
                <span className="text-sm font-medium" style={{ color: statusColor }}>
                  {getStatusText(site?.compliance_status, score)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#104B3A] to-[#0B372A] rounded-lg shadow-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Compliance Clock</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border-2 border-[#C44536]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/80">Overdue</span>
                <AlertCircle className="h-5 w-5 text-[#C44536]" />
              </div>
              <div className="text-4xl font-bold text-[#C44536]">{stats?.obligations.overdue || 0}</div>
              <Button
                className="mt-3 w-full bg-[#C44536] hover:bg-[#A33528] text-white"
                onClick={() => router.push(\`/dashboard/sites/\${siteId}/obligations?filter=overdue\`)}
              >
                View →
              </Button>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border-2 border-[#D4A017]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/80">Due Soon (7 days)</span>
                <Clock className="h-5 w-5 text-[#D4A017]" />
              </div>
              <div className="text-4xl font-bold text-[#D4A017]">{stats?.obligations.due_soon || 0}</div>
              <Button
                className="mt-3 w-full bg-[#D4A017] hover:bg-[#B58914] text-white"
                onClick={() => router.push(\`/dashboard/sites/\${siteId}/obligations?filter=due_soon\`)}
              >
                View →
              </Button>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border-2 border-[#2E7D32]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/80">On Track</span>
                <CheckCircle2 className="h-5 w-5 text-[#2E7D32]" />
              </div>
              <div className="text-4xl font-bold text-[#2E7D32]">{stats?.obligations.compliant || 0}</div>
              <Button
                className="mt-3 w-full bg-[#2E7D32] hover:bg-[#246627] text-white"
                onClick={() => router.push(\`/dashboard/sites/\${siteId}/obligations?filter=compliant\`)}
              >
                View →
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#101314] mb-6">Module Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border-2 border-[#2E7D32] rounded-lg p-5 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#2E7D32] rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-[#2E7D32] text-white rounded-full">
                  ACTIVE
                </span>
              </div>
              <h3 className="font-bold text-[#101314] mb-2">Environmental Permits</h3>
              <p className="text-sm text-gray-600 mb-4">Core permit management</p>
              <Button
                className="w-full bg-[#2E7D32] hover:bg-[#246627] text-white"
                onClick={() => router.push(\`/dashboard/sites/\${siteId}/permits/documents\`)}
              >
                Manage →
              </Button>
            </div>

            <div className={\`border-2 rounded-lg p-5 \${modules?.module2 ? 'border-[#2E7D32] bg-green-50' : 'border-gray-300 bg-gray-50'}\`}>
              <div className="flex items-center justify-between mb-3">
                <div className={\`p-2 rounded-lg \${modules?.module2 ? 'bg-[#2E7D32]' : 'bg-gray-400'}\`}>
                  <Beaker className="h-5 w-5 text-white" />
                </div>
                <span className={\`px-2 py-1 text-xs font-medium rounded-full \${
                  modules?.module2
                    ? 'bg-[#2E7D32] text-white'
                    : 'bg-gray-300 text-gray-600'
                }\`}>
                  {modules?.module2 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-[#101314] mb-2">Trade Effluent</h3>
              <p className="text-sm text-gray-600 mb-4">Water discharge monitoring</p>
              {modules?.module2 ? (
                <Button
                  className="w-full bg-[#2E7D32] hover:bg-[#246627] text-white"
                  onClick={() => router.push(\`/dashboard/sites/\${siteId}/trade-effluent/parameters\`)}
                >
                  Manage →
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Not Purchased
                </Button>
              )}
            </div>

            <div className={\`border-2 rounded-lg p-5 \${modules?.module3 ? 'border-[#2E7D32] bg-green-50' : 'border-gray-300 bg-gray-50'}\`}>
              <div className="flex items-center justify-between mb-3">
                <div className={\`p-2 rounded-lg \${modules?.module3 ? 'bg-[#2E7D32]' : 'bg-gray-400'}\`}>
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className={\`px-2 py-1 text-xs font-medium rounded-full \${
                  modules?.module3
                    ? 'bg-[#2E7D32] text-white'
                    : 'bg-gray-300 text-gray-600'
                }\`}>
                  {modules?.module3 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-[#101314] mb-2">MCPD/Generators</h3>
              <p className="text-sm text-gray-600 mb-4">Generator runtime tracking</p>
              {modules?.module3 ? (
                <Button
                  className="w-full bg-[#2E7D32] hover:bg-[#246627] text-white"
                  onClick={() => router.push(\`/dashboard/sites/\${siteId}/generators/run-hours\`)}
                >
                  Manage →
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Not Purchased
                </Button>
              )}
            </div>

            <div className={\`border-2 rounded-lg p-5 \${modules?.module4 ? 'border-[#2E7D32] bg-green-50' : 'border-gray-300 bg-gray-50'}\`}>
              <div className="flex items-center justify-between mb-3">
                <div className={\`p-2 rounded-lg \${modules?.module4 ? 'bg-[#2E7D32]' : 'bg-gray-400'}\`}>
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <span className={\`px-2 py-1 text-xs font-medium rounded-full \${
                  modules?.module4
                    ? 'bg-[#2E7D32] text-white'
                    : 'bg-gray-300 text-gray-600'
                }\`}>
                  {modules?.module4 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-[#101314] mb-2">Hazardous Waste</h3>
              <p className="text-sm text-gray-600 mb-4">Waste stream tracking</p>
              {modules?.module4 ? (
                <Button
                  className="w-full bg-[#2E7D32] hover:bg-[#246627] text-white"
                  onClick={() => router.push(\`/dashboard/sites/\${siteId}/hazardous-waste/waste-streams\`)}
                >
                  Manage →
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Not Purchased
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#101314] mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="w-full h-auto p-6 bg-[#104B3A] hover:bg-[#0B372A] text-white flex items-center justify-between group"
              onClick={() => router.push(\`/dashboard/sites/\${siteId}/permits/documents/upload\`)}
            >
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-semibold">Upload Document</p>
                  <p className="text-sm text-white/80">Add permit or evidence</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              className="w-full h-auto p-6 bg-[#0056A6] hover:bg-[#004080] text-white flex items-center justify-between group"
              onClick={() => router.push(\`/dashboard/sites/\${siteId}/audit-packs\`)}
            >
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-semibold">Generate Audit Pack</p>
                  <p className="text-sm text-white/80">Create compliance package</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              className="w-full h-auto p-6 bg-[#104B3A] hover:bg-[#0B372A] text-white flex items-center justify-between group"
              onClick={() => router.push(\`/dashboard/sites/\${siteId}/settings\`)}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-semibold">View Reports</p>
                  <p className="text-sm text-white/80">Compliance analytics</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
