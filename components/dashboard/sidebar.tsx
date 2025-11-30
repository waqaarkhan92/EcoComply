'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  FolderOpen,
  Package,
  Settings,
  Bell,
  Beaker,
  TestTube,
  Zap,
  Clock,
} from 'lucide-react';
import { useModuleActivation } from '@/lib/hooks/use-module-activation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Obligations', href: '/dashboard/obligations', icon: ClipboardList },
  { name: 'Evidence', href: '/dashboard/evidence', icon: FolderOpen },
  { name: 'Packs', href: '/dashboard/packs', icon: Package },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// Module 2 navigation items (Trade Effluent)
const getModule2Navigation = (siteId: string | null) => [
  { name: 'Parameters', href: siteId ? `/dashboard/sites/${siteId}/module-2/parameters` : '#', icon: Beaker, badge: 'Module 2' },
  { name: 'Lab Results', href: siteId ? `/dashboard/sites/${siteId}/module-2/lab-results` : '#', icon: TestTube, badge: 'Module 2' },
];

// Module 3 navigation items (MCPD/Generators)
const getModule3Navigation = (siteId: string | null) => [
  { name: 'Generators', href: siteId ? `/dashboard/sites/${siteId}/module-3/generators` : '#', icon: Zap, badge: 'Module 3' },
  { name: 'Run Hours', href: siteId ? `/dashboard/sites/${siteId}/module-3/run-hours` : '#', icon: Clock, badge: 'Module 3' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: isModule2Active, isLoading: isLoadingModule2 } = useModuleActivation('MODULE_2');
  const { data: isModule3Active, isLoading: isLoadingModule3 } = useModuleActivation('MODULE_3');

  // Extract siteId from pathname if we're on a site page
  const siteIdMatch = pathname?.match(/\/sites\/([^/]+)/);
  const currentSiteId = siteIdMatch ? siteIdMatch[1] : null;

  return (
    <div className="hidden md:flex w-64 bg-charcoal h-screen flex-col border-r border-border-gray">
      <div className="h-16 border-b border-border-gray flex items-center px-6">
        <h1 className="text-xl font-bold text-white">EcoComply</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-white' // Active: Primary Teal background, white text
                  : 'text-white hover:bg-border-gray' // Inactive: White text, hover: Light gray background
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Module 2 Navigation - Only show if activated and on a site page */}
        {!isLoadingModule2 && isModule2Active && currentSiteId && (
          <>
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
                    <span className="ml-auto text-xs text-gray-400">{item.badge}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Module 3 Navigation - Only show if activated and on a site page */}
        {!isLoadingModule3 && isModule3Active && currentSiteId && (
          <>
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
                    <span className="ml-auto text-xs text-gray-400">{item.badge}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </div>
  );
}

