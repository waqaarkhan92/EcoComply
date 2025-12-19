'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Package,
  Clock3,
  FolderOpen,
  Settings,
  Beaker,
  AlertCircle,
  FileText,
  AlertTriangle,
  ClipboardList,
  Gauge,
  FileSpreadsheet,
  Trash2,
  FileCheck,
  Link2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Home,
  Shield,
  Activity,
  ArrowLeft,
  Layers,
  History,
  Brain,
  UserCog,
  Share2,
} from 'lucide-react';
import { useModuleActivation } from '@/lib/hooks/use-module-activation';
import { useAuthStore } from '@/lib/store/auth-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient } from '@/lib/api/client';


// =============================================================================
// NAVIGATION CONFIG - OPTIMIZED FOR 10 ITEMS MAX
// =============================================================================

// Icon size constant for consistency
const ICON_SIZE = 'h-5 w-5';

// Global navigation - Company User View (5 items - removed Compliance which is site-level)
const getCompanyUserNavigation = () => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Building2 },
  { name: 'Deadlines', href: '/dashboard/deadlines', icon: Clock3 },
  { name: 'Audit Packs', href: '/dashboard/packs', icon: Package },
];

// Global navigation - Consultant View (multi-tenant)
const getConsultantNavigation = () => [
  { name: 'Dashboard', href: '/dashboard/consultant', icon: LayoutDashboard },
  { name: 'Clients', href: '/dashboard/consultant/clients', icon: Building2 },
  { name: 'Deadlines', href: '/dashboard/deadlines', icon: Clock3 },
  { name: 'Audit Packs', href: '/dashboard/consultant/packs', icon: Package },
];

// Account navigation (always at bottom - 2 items)
const getAccountNavigation = () => [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
];

// Admin navigation (OWNER/ADMIN only)
const getAdminNavigation = () => [
  { name: 'AI Insights', href: '/admin/ai-insights', icon: Brain },
  { name: 'Reviewer Metrics', href: '/admin/reviewer-metrics', icon: UserCog },
  { name: 'Shared Patterns', href: '/admin/shared-patterns', icon: Share2 },
];

// =============================================================================
// SITE-LEVEL NAVIGATION - DROPDOWN STRUCTURE
// =============================================================================

// Permits dropdown items (Module 1 - Always visible)
const getPermitsDropdownItems = (siteId: string) => [
  { name: 'Documents', href: `/dashboard/sites/${siteId}/permits/documents`, icon: FileText },
  { name: 'Obligations', href: `/dashboard/sites/${siteId}/permits/obligations`, icon: ClipboardList },
  { name: 'Evidence', href: `/dashboard/sites/${siteId}/permits/evidence`, icon: FolderOpen },
  { name: 'Audit Packs', href: `/dashboard/sites/${siteId}/packs`, icon: Package },
];

// Compliance dropdown items (EA CCS)
const getComplianceDropdownItems = (siteId: string) => [
  { name: 'CCS Assessment', href: `/dashboard/sites/${siteId}/compliance/ccs`, icon: Shield },
  { name: 'ELV Conditions', href: `/dashboard/sites/${siteId}/compliance/elv`, icon: Activity },
  { name: 'CAPA Tracker', href: `/dashboard/sites/${siteId}/compliance/capa`, icon: AlertTriangle },
];

// Module items for the Modules dropdown
const getModule2Items = (siteId: string) => [
  { name: 'Trade Effluent', href: `/dashboard/sites/${siteId}/module-2/consents`, icon: Beaker, isHeader: true },
  { name: 'Consents', href: `/dashboard/sites/${siteId}/module-2/consents`, icon: FileText },
  { name: 'Parameters', href: `/dashboard/sites/${siteId}/module-2/parameters`, icon: Beaker },
  { name: 'Lab Results', href: `/dashboard/sites/${siteId}/module-2/lab-results`, icon: ClipboardList },
  { name: 'Exceedances', href: `/dashboard/sites/${siteId}/module-2/exceedances`, icon: AlertTriangle },
];

const getModule3Items = (siteId: string) => [
  { name: 'Generators', href: `/dashboard/sites/${siteId}/module-3/generators`, icon: AlertCircle, isHeader: true },
  { name: 'Generator List', href: `/dashboard/sites/${siteId}/module-3/generators`, icon: AlertCircle },
  { name: 'Run Hours', href: `/dashboard/sites/${siteId}/module-3/run-hours`, icon: Gauge },
  { name: 'Stack Tests', href: `/dashboard/sites/${siteId}/module-3/stack-tests`, icon: FileSpreadsheet },
  { name: 'AER Report', href: `/dashboard/sites/${siteId}/module-3/aer`, icon: FileSpreadsheet },
];

const getModule4Items = (siteId: string) => [
  { name: 'Hazardous Waste', href: `/dashboard/sites/${siteId}/hazardous-waste/waste-streams`, icon: Trash2, isHeader: true },
  { name: 'Waste Streams', href: `/dashboard/sites/${siteId}/hazardous-waste/waste-streams`, icon: Trash2 },
  { name: 'Consignments', href: `/dashboard/sites/${siteId}/hazardous-waste/consignments`, icon: FileCheck },
  { name: 'Chain of Custody', href: `/dashboard/sites/${siteId}/hazardous-waste/chain-of-custody`, icon: Link2 },
  { name: 'Contractors', href: `/dashboard/sites/${siteId}/hazardous-waste/contractors`, icon: ShieldCheck },
];

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: isModule2Active, isLoading: isLoadingModule2 } = useModuleActivation('MODULE_2');
  const { data: isModule3Active, isLoading: isLoadingModule3 } = useModuleActivation('MODULE_3');
  const { data: isModule4Active, isLoading: isLoadingModule4 } = useModuleActivation('MODULE_4');

  // Extract siteId from pathname if we're on a site page
  const siteIdMatch = pathname?.match(/\/sites\/([^/]+)/);
  const currentSiteId = siteIdMatch ? siteIdMatch[1] : null;

  // Fetch current site details when on a site page
  const { data: currentSite } = useQuery({
    queryKey: ['site', currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return null;
      const response = await apiClient.get(`/sites/${currentSiteId}`);
      return response.data as { id: string; name: string };
    },
    enabled: !!currentSiteId,
  });

  // Recent Sites - Track and store in localStorage
  const [recentSites, setRecentSites] = useState<Array<{ id: string; name: string }>>([]);

  // Load recent sites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ecocomply-recent-sites');
    if (stored) {
      try {
        setRecentSites(JSON.parse(stored));
      } catch (e) {
        // Invalid JSON, clear it
        localStorage.removeItem('ecocomply-recent-sites');
      }
    }
  }, []);

  // Update recent sites when visiting a site page
  useEffect(() => {
    if (currentSiteId && currentSite?.name) {
      setRecentSites((prev) => {
        // Remove if already exists and add to front
        const filtered = prev.filter((s) => s.id !== currentSiteId);
        const updated = [{ id: currentSiteId, name: currentSite.name }, ...filtered].slice(0, 5);
        localStorage.setItem('ecocomply-recent-sites', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentSiteId, currentSite?.name]);

  // Determine if user is a consultant
  const isConsultant = user?.role === 'CONSULTANT';

  // Determine if user has admin access
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Get the appropriate navigation based on user role
  const globalNavigation = isConsultant ? getConsultantNavigation() : getCompanyUserNavigation();
  const accountNavigation = getAccountNavigation();
  const adminNavigation = getAdminNavigation();

  // Check if any modules are active
  const hasActiveModules = !isLoadingModule2 && !isLoadingModule3 && !isLoadingModule4 &&
    (isModule2Active || isModule3Active || isModule4Active);

  // Combine active module items for the Modules dropdown
  const getModuleDropdownItems = (siteId: string) => {
    const items: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }>; isHeader?: boolean; isDivider?: boolean }> = [];

    if (isModule2Active) {
      if (items.length > 0) items.push({ name: '', href: '', icon: Beaker, isDivider: true });
      items.push(...getModule2Items(siteId));
    }
    if (isModule3Active) {
      if (items.length > 0) items.push({ name: '', href: '', icon: AlertCircle, isDivider: true });
      items.push(...getModule3Items(siteId));
    }
    if (isModule4Active) {
      if (items.length > 0) items.push({ name: '', href: '', icon: Trash2, isDivider: true });
      items.push(...getModule4Items(siteId));
    }

    return items;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
          className={cn(
            'hidden md:flex bg-charcoal h-screen flex-col border-r border-[#2A2F33] transition-all duration-300 ease-in-out relative',
            isCollapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#2A2F33] bg-charcoal text-gray-400 hover:bg-[#1A1F23] hover:text-white transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Logo */}
          <div className="h-16 border-b border-[#2A2F33] flex items-center px-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              {!isCollapsed && (
                <span className="text-lg font-semibold text-white tracking-tight whitespace-nowrap">
                  EcoComply
                </span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">
            {/* Global Section - 4 items */}
            {!currentSiteId && (
              <>
                <NavSectionLabel label="Navigation" isCollapsed={isCollapsed} />
                <div className="space-y-1">
                  {globalNavigation.map((item) => (
                    <NavItem
                      key={item.name}
                      name={item.name}
                      href={item.href}
                      icon={item.icon}
                      isActive={pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'))}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </div>

                {/* Recent Sites - Quick access to recently visited sites */}
                {recentSites.length > 0 && (
                  <div className="mt-6">
                    <NavSectionLabel label="Recent Sites" isCollapsed={isCollapsed} />
                    <div className="space-y-1">
                      {recentSites.slice(0, 3).map((site) => (
                        <NavItem
                          key={site.id}
                          name={site.name}
                          href={`/dashboard/sites/${site.id}/dashboard`}
                          icon={History}
                          isActive={false}
                          isCollapsed={isCollapsed}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Section - Only for OWNER/ADMIN */}
                {isAdmin && (
                  <div className="mt-6">
                    <NavSectionLabel label="Admin" isCollapsed={isCollapsed} />
                    <div className="space-y-1">
                      {adminNavigation.map((item) => (
                        <NavItem
                          key={item.name}
                          name={item.name}
                          href={item.href}
                          icon={item.icon}
                          isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
                          isCollapsed={isCollapsed}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Site Context Navigation - Only when on a site page */}
            {currentSiteId && (
              <>
                {/* Back to Sites */}
                <div className="mb-4">
                  <NavItem
                    name="Back to Sites"
                    href="/dashboard/sites"
                    icon={ArrowLeft}
                    isActive={false}
                    isCollapsed={isCollapsed}
                  />
                </div>

                {/* Site Name Header */}
                <NavSectionLabel label={currentSite?.name || 'Site'} isCollapsed={isCollapsed} />

                <div className="space-y-1">
                  {/* Overview - Single item */}
                  <NavItem
                    name="Overview"
                    href={`/dashboard/sites/${currentSiteId}/dashboard`}
                    icon={Home}
                    isActive={pathname === `/dashboard/sites/${currentSiteId}/dashboard`}
                    isCollapsed={isCollapsed}
                  />

                  {/* Permits Dropdown */}
                  <NavDropdown
                    name="Permits"
                    icon={FileText}
                    items={getPermitsDropdownItems(currentSiteId)}
                    isCollapsed={isCollapsed}
                    pathname={pathname}
                    basePath={`/dashboard/sites/${currentSiteId}/permits`}
                  />

                  {/* Compliance Dropdown */}
                  <NavDropdown
                    name="Compliance"
                    icon={Shield}
                    items={getComplianceDropdownItems(currentSiteId)}
                    isCollapsed={isCollapsed}
                    pathname={pathname}
                    basePath={`/dashboard/sites/${currentSiteId}/compliance`}
                  />

                  {/* Modules Dropdown - Only show if any modules are active */}
                  {hasActiveModules && (
                    <NavDropdown
                      name="Modules"
                      icon={Layers}
                      items={getModuleDropdownItems(currentSiteId)}
                      isCollapsed={isCollapsed}
                      pathname={pathname}
                      basePath={`/dashboard/sites/${currentSiteId}/module`}
                    />
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Account Section - Always at bottom */}
          <div className="px-2 py-4 border-t border-[#2A2F33]">
            <div className="space-y-1">
              {accountNavigation.map((item) => (
                <NavItem
                  key={item.name}
                  name={item.name}
                  href={item.href}
                  icon={item.icon}
                  isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>

            {/* Version */}
            <div className={cn('mt-4 pt-3 border-t border-[#2A2F33]', isCollapsed ? 'text-center' : 'px-3')}>
              <p className="text-xs text-gray-600">{isCollapsed ? 'v1' : 'v1.0.0'}</p>
            </div>
          </div>
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface NavItemProps {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  isCollapsed?: boolean;
}

function NavItem({ name, href, icon: Icon, isActive, isCollapsed }: NavItemProps) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-400 hover:bg-[#1A1F23] hover:text-white',
        isCollapsed && 'justify-center px-2'
      )}
      aria-label={name}
    >
      <Icon className={cn(ICON_SIZE, 'flex-shrink-0')} />
      {!isCollapsed && <span className="truncate">{name}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="bg-charcoal text-white border-[#2A2F33]">
          {name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

// =============================================================================
// NavDropdown - Expandable dropdown menu for site navigation
// =============================================================================

interface NavDropdownItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isHeader?: boolean;
  isDivider?: boolean;
}

interface NavDropdownProps {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavDropdownItem[];
  isCollapsed?: boolean;
  pathname: string | null;
  basePath: string;
}

function NavDropdown({
  name,
  icon: Icon,
  items,
  isCollapsed,
  pathname,
  basePath,
}: NavDropdownProps) {
  // Check if any child is active
  const isAnyChildActive = items.some(
    item => !item.isDivider && (pathname === item.href || pathname?.startsWith(item.href + '/'))
  );

  // Auto-expand if any child is active
  const [isOpen, setIsOpen] = useState(isAnyChildActive);

  // Toggle dropdown
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Collapsed state - show as tooltip with dropdown on hover
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'flex items-center justify-center w-full px-2 py-2 text-sm font-medium rounded-lg transition-colors',
              isAnyChildActive
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:bg-[#1A1F23] hover:text-white'
            )}
            aria-label={name}
          >
            <Icon className={cn(ICON_SIZE, 'flex-shrink-0')} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-charcoal border-[#2A2F33] p-0 w-48"
          sideOffset={8}
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {name}
            </div>
            {items.filter(item => !item.isDivider && !item.isHeader).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  pathname === item.href || pathname?.startsWith(item.href + '/')
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-[#1A1F23] hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded state - show as collapsible section
  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
          isAnyChildActive
            ? 'bg-primary/10 text-primary'
            : 'text-gray-400 hover:bg-[#1A1F23] hover:text-white'
        )}
        aria-expanded={isOpen}
        aria-label={`${name} menu`}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn(ICON_SIZE, 'flex-shrink-0')} />
          <span className="truncate">{name}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 space-y-0.5 border-l border-[#2A2F33] pl-3">
              {items.map((item, index) => {
                if (item.isDivider) {
                  return (
                    <div
                      key={`divider-${index}`}
                      className="my-2 border-t border-[#2A2F33]"
                    />
                  );
                }

                if (item.isHeader) {
                  return (
                    <div
                      key={item.name}
                      className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {item.name}
                    </div>
                  );
                }

                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:bg-[#1A1F23] hover:text-white'
                    )}
                    aria-label={item.name}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NavSectionLabelProps {
  label: string;
  isCollapsed?: boolean;
}

function NavSectionLabel({ label, isCollapsed }: NavSectionLabelProps) {
  if (isCollapsed) {
    return null; // Don't show labels when collapsed
  }

  return (
    <p className="px-3 mb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
      {label}
    </p>
  );
}
