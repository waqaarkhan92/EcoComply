'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Package,
  Clock3,
  ListTodo,
  FolderOpen,
  Settings,
  Beaker,
  TestTube,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { useModuleActivation } from '@/lib/hooks/use-module-activation';
import { useAuthStore } from '@/lib/store/auth-store';

// Global navigation - Company User View (most users)
const getCompanyUserNavigation = () => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Building2 }, // Company users see "Sites"
  { name: 'Audit Packs', href: '/dashboard/packs', icon: Package },
  { name: 'Compliance Clock', href: '/dashboard/compliance-clocks', icon: Clock3 },
  { name: 'Tasks & Actions', href: '/dashboard/recurring-tasks', icon: ListTodo },
  { name: 'Evidence Library', href: '/dashboard/evidence', icon: FolderOpen },
  { name: 'Settings', href: '/dashboard/profile', icon: Settings },
];

// Global navigation - Consultant View (multi-tenant)
const getConsultantNavigation = () => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Companies', href: '/dashboard/companies', icon: Building2 }, // Consultants see "Companies"
  { name: 'Audit Packs', href: '/dashboard/packs', icon: Package },
  { name: 'Settings', href: '/dashboard/profile', icon: Settings },
];

// Module 1 navigation items (Environmental Permits) - Always visible
const getModule1Navigation = (siteId: string | null) => [
  { name: 'Permit Documents', href: siteId ? `/dashboard/sites/${siteId}/permits/documents` : '#', icon: FolderOpen },
  { name: 'Permit Obligations', href: siteId ? `/dashboard/sites/${siteId}/permits/obligations` : '#', icon: AlertCircle },
  { name: 'Permit Workflows', href: siteId ? `/dashboard/sites/${siteId}/permits/workflows` : '#', icon: Settings },
];

// Module 2 navigation items (Trade Effluent) - If purchased
const getModule2Navigation = (siteId: string | null) => [
  { name: 'Parameters', href: siteId ? `/dashboard/sites/${siteId}/trade-effluent/parameters` : '#', icon: Beaker },
  { name: 'Exceedances', href: siteId ? `/dashboard/sites/${siteId}/trade-effluent/exceedances` : '#', icon: AlertCircle },
  { name: 'Corrective Actions', href: siteId ? `/dashboard/sites/${siteId}/trade-effluent/corrective-actions` : '#', icon: ListTodo },
];

// Module 3 navigation items (MCPD/Generators) - If purchased
const getModule3Navigation = (siteId: string | null) => [
  { name: 'Run Hours', href: siteId ? `/dashboard/sites/${siteId}/generators/run-hours` : '#', icon: Clock3 },
  { name: 'Runtime Monitoring', href: siteId ? `/dashboard/sites/${siteId}/generators/runtime-monitoring` : '#', icon: AlertCircle },
  { name: 'Fuel Usage', href: siteId ? `/dashboard/sites/${siteId}/generators/fuel-usage-logs` : '#', icon: Zap },
  { name: 'AER', href: siteId ? `/dashboard/sites/${siteId}/generators/aer` : '#', icon: FolderOpen },
];

// Module 4 navigation items (Hazardous Waste) - If purchased
const getModule4Navigation = (siteId: string | null) => [
  { name: 'Waste Streams', href: siteId ? `/dashboard/sites/${siteId}/hazardous-waste/waste-streams` : '#', icon: FolderOpen },
  { name: 'Consignment Notes', href: siteId ? `/dashboard/sites/${siteId}/hazardous-waste/consignment-notes` : '#', icon: FolderOpen },
  { name: 'Chain of Custody', href: siteId ? `/dashboard/sites/${siteId}/hazardous-waste/chain-of-custody` : '#', icon: AlertCircle },
  { name: 'Validation Rules', href: siteId ? `/dashboard/sites/${siteId}/hazardous-waste/validation-rules` : '#', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { data: isModule2Active, isLoading: isLoadingModule2 } = useModuleActivation('MODULE_2');
  const { data: isModule3Active, isLoading: isLoadingModule3 } = useModuleActivation('MODULE_3');
  const { data: isModule4Active, isLoading: isLoadingModule4 } = useModuleActivation('MODULE_4');

  // Extract siteId from pathname if we're on a site page
  const siteIdMatch = pathname?.match(/\/sites\/([^/]+)/);
  const currentSiteId = siteIdMatch ? siteIdMatch[1] : null;

  // Determine if user is a consultant
  const isConsultant = user?.role === 'CONSULTANT';

  // Get the appropriate navigation based on user role
  const globalNavigation = isConsultant ? getConsultantNavigation() : getCompanyUserNavigation();

  return (
    <div className="hidden md:flex w-64 bg-charcoal h-screen flex-col border-r border-border-gray">
      <div className="h-16 border-b border-border-gray flex items-center px-6">
        <h1 className="text-xl font-bold text-white">EcoComply</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Global Navigation - Always Visible */}
        {globalNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-white hover:bg-border-gray'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Site-Level Modules - Only show when on a site page */}
        {currentSiteId && (
          <>
            {/* Module 1: Environmental Permits (Always Visible) */}
            <div className="pt-4 mt-4 border-t border-border-gray">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Environmental Permits
              </p>
              {getModule1Navigation(currentSiteId).map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-white hover:bg-border-gray'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Module 2: Trade Effluent (If Purchased) */}
            {!isLoadingModule2 && isModule2Active && (
              <div className="pt-4 mt-4 border-t border-border-gray">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Trade Effluent
                </p>
                {getModule2Navigation(currentSiteId).map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-white hover:bg-border-gray'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Module 3: MCPD/Generators (If Purchased) */}
            {!isLoadingModule3 && isModule3Active && (
              <div className="pt-4 mt-4 border-t border-border-gray">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  MCPD/Generators
                </p>
                {getModule3Navigation(currentSiteId).map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-white hover:bg-border-gray'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Module 4: Hazardous Waste (If Purchased) */}
            {!isLoadingModule4 && isModule4Active && (
              <div className="pt-4 mt-4 border-t border-border-gray">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Hazardous Waste
                </p>
                {getModule4Navigation(currentSiteId).map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-white hover:bg-border-gray'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </nav>
    </div>
  );
}

