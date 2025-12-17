'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  ClipboardList,
  FolderOpen,
  Package,
  Settings,
  Plus,
  Upload,
  LayoutDashboard,
  Bell,
  Calendar,
  AlertTriangle,
  Share2,
  Beaker,
  TestTube,
  Zap,
  Clock,
  Building2,
  History,
  Star,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
  keywords?: string[];
  group?: string;
  shortcut?: string;
  badge?: {
    text: string;
    variant: 'danger' | 'warning' | 'success';
  };
}

interface Site {
  id: string;
  name: string;
  compliance_score?: number;
  overdue_count?: number;
}

// Recent items stored in localStorage
const RECENT_KEY = 'ecocomply_recent_pages';
const MAX_RECENT = 5;

function getRecentPages(): { path: string; label: string; timestamp: number }[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentPage(path: string, label: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentPages().filter((r) => r.path !== path);
    recent.unshift({ path, label, timestamp: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore localStorage errors
  }
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // Fetch sites for quick navigation
  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => apiClient.get<{ data: Site[] }>('/sites'),
    enabled: isOpen,
  });

  const sites: any[] = sitesData?.data || [];

  // Toggle command palette with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      // "?" to show shortcuts help
      if (e.key === '?' && !isOpen && !showShortcuts) {
        e.preventDefault();
        setShowShortcuts(true);
      }
      // Quick shortcuts when palette is closed
      if (!isOpen && !showShortcuts) {
        // G then D = Go to Dashboard
        if (e.key === 'g') {
          const handleSecondKey = (e2: KeyboardEvent) => {
            if (e2.key === 'd') router.push('/dashboard');
            if (e2.key === 's') router.push('/dashboard/sites');
            if (e2.key === 'l') router.push('/dashboard/deadlines');
            if (e2.key === 'e') router.push('/dashboard/evidence');
            if (e2.key === 'p') router.push('/dashboard/packs/regulatory');
            if (e2.key === 'r') router.push('/dashboard/reports');
            document.removeEventListener('keydown', handleSecondKey);
          };
          document.addEventListener('keydown', handleSecondKey, { once: true });
          setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 1000);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, showShortcuts, router]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen]);

  const navigate = useCallback(
    (path: string, label?: string) => {
      if (label) addRecentPage(path, label);
      setIsOpen(false);
      setSearch('');
      router.push(path);
    },
    [router]
  );

  // Get recent pages
  const recentPages = useMemo(() => getRecentPages(), [isOpen]);

  // Define all available commands
  const commands: CommandItem[] = useMemo(() => [
    // Quick Actions (most common)
    {
      id: 'action-upload-document',
      label: 'Upload Document',
      description: 'Upload a new permit or document',
      icon: Upload,
      action: () => navigate('/dashboard/documents/upload', 'Upload Document'),
      keywords: ['add', 'create', 'new', 'permit'],
      group: 'Quick Actions',
      shortcut: '⌘⇧D',
    },
    {
      id: 'action-upload-evidence',
      label: 'Upload Evidence',
      description: 'Upload evidence for obligations',
      icon: FolderOpen,
      action: () => navigate('/dashboard/evidence/upload', 'Upload Evidence'),
      keywords: ['add', 'create', 'new', 'proof'],
      group: 'Quick Actions',
      shortcut: '⌘⇧E',
    },
    {
      id: 'action-generate-pack',
      label: 'Generate Pack',
      description: 'Create a new compliance pack',
      icon: Package,
      action: () => navigate('/dashboard/packs?action=generate', 'Generate Pack'),
      keywords: ['create', 'report', 'bundle', 'audit'],
      group: 'Quick Actions',
      shortcut: '⌘⇧P',
    },

    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Portfolio overview',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard', 'Dashboard'),
      keywords: ['home', 'overview', 'portfolio'],
      group: 'Navigation',
      shortcut: 'G D',
    },
    {
      id: 'nav-sites',
      label: 'All Sites',
      description: 'View all sites',
      icon: Building2,
      action: () => navigate('/dashboard/sites', 'All Sites'),
      keywords: ['locations', 'facilities'],
      group: 'Navigation',
      shortcut: 'G S',
    },
    {
      id: 'nav-deadlines',
      label: 'Deadlines',
      description: 'View all deadlines',
      icon: Clock,
      action: () => navigate('/dashboard/deadlines', 'Deadlines'),
      keywords: ['due', 'upcoming', 'overdue'],
      group: 'Navigation',
      shortcut: 'G L',
    },
    {
      id: 'nav-evidence',
      label: 'Evidence Library',
      description: 'Browse all evidence',
      icon: FolderOpen,
      action: () => navigate('/dashboard/evidence', 'Evidence Library'),
      keywords: ['files', 'proof', 'attachments'],
      group: 'Navigation',
      shortcut: 'G E',
    },
    {
      id: 'nav-packs',
      label: 'Compliance Packs',
      description: 'View and generate packs',
      icon: Package,
      action: () => navigate('/dashboard/packs', 'Compliance Packs'),
      keywords: ['reports', 'bundles', 'audit'],
      group: 'Navigation',
      shortcut: 'G P',
    },
    {
      id: 'nav-notifications',
      label: 'Notifications',
      description: 'View notifications',
      icon: Bell,
      action: () => navigate('/dashboard/notifications', 'Notifications'),
      keywords: ['alerts', 'messages'],
      group: 'Navigation',
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'Manage settings',
      icon: Settings,
      action: () => navigate('/dashboard/settings', 'Settings'),
      keywords: ['preferences', 'config', 'account'],
      group: 'Navigation',
    },
    {
      id: 'nav-reports',
      label: 'Reports',
      description: 'Generate and view reports',
      icon: FileText,
      action: () => navigate('/dashboard/reports', 'Reports'),
      keywords: ['export', 'download', 'analytics'],
      group: 'Navigation',
      shortcut: 'G R',
    },

    // Help
    {
      id: 'help-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: Zap,
      action: () => {
        setIsOpen(false);
        setTimeout(() => setShowShortcuts(true), 100);
      },
      keywords: ['help', 'keys', 'hotkeys'],
      group: 'Help',
      shortcut: '?',
    },

    // Filters / Views
    {
      id: 'view-overdue',
      label: 'View Overdue Items',
      description: 'Show all overdue obligations',
      icon: AlertTriangle,
      action: () => navigate('/dashboard/deadlines?filter=overdue', 'Overdue Items'),
      keywords: ['late', 'missed', 'urgent'],
      group: 'Quick Views',
      badge: { text: 'Urgent', variant: 'danger' },
    },
    {
      id: 'view-due-soon',
      label: 'View Due This Week',
      description: 'Show items due this week',
      icon: Clock,
      action: () => navigate('/dashboard/deadlines?filter=this-week', 'Due This Week'),
      keywords: ['upcoming', 'soon', 'week'],
      group: 'Quick Views',
      badge: { text: 'Soon', variant: 'warning' },
    },
    {
      id: 'view-expiring-evidence',
      label: 'Expiring Evidence',
      description: 'View evidence expiring soon',
      icon: AlertTriangle,
      action: () => navigate('/dashboard/evidence/expiring', 'Expiring Evidence'),
      keywords: ['alerts', 'deadline', 'urgent'],
      group: 'Quick Views',
    },

    // Modules
    {
      id: 'module-trade-effluent',
      label: 'Trade Effluent',
      description: 'Manage trade effluent consents',
      icon: Beaker,
      action: () => navigate('/dashboard/module-2/consent-states', 'Trade Effluent'),
      keywords: ['module 2', 'effluent', 'water', 'discharge'],
      group: 'Modules',
    },
    {
      id: 'module-generators',
      label: 'Generators',
      description: 'Manage generator compliance',
      icon: Zap,
      action: () => navigate('/dashboard/module-3/generators', 'Generators'),
      keywords: ['module 3', 'mcpd', 'equipment', 'run hours'],
      group: 'Modules',
    },
    {
      id: 'module-hazardous-waste',
      label: 'Hazardous Waste',
      description: 'Manage hazardous waste',
      icon: AlertTriangle,
      action: () => navigate('/dashboard/module-4/waste-streams', 'Hazardous Waste'),
      keywords: ['module 4', 'waste', 'consignment'],
      group: 'Modules',
    },
  ], [navigate]);

  // Add site commands dynamically
  const siteCommands: CommandItem[] = useMemo(() =>
    sites.map((site) => ({
      id: `site-${site.id}`,
      label: site.name,
      description: site.compliance_score !== undefined
        ? `${site.compliance_score}% compliant${site.overdue_count ? ` · ${site.overdue_count} overdue` : ''}`
        : 'View site dashboard',
      icon: Building2,
      action: () => navigate(`/dashboard/sites/${site.id}/dashboard`, site.name),
      keywords: ['site', 'location', site.name.toLowerCase()],
      group: 'Sites',
      badge: site.overdue_count && site.overdue_count > 0
        ? { text: `${site.overdue_count} overdue`, variant: 'danger' as const }
        : undefined,
    })),
    [sites, navigate]
  );

  // Add recent page commands
  const recentCommands: CommandItem[] = useMemo(() =>
    recentPages.map((recent, i) => ({
      id: `recent-${i}`,
      label: recent.label,
      description: 'Recently visited',
      icon: History,
      action: () => navigate(recent.path, recent.label),
      keywords: ['recent', 'history'],
      group: 'Recent',
    })),
    [recentPages, navigate]
  );

  // Combine all commands
  const allCommands = useMemo(() => {
    if (search) {
      // When searching, show all commands
      return [...commands, ...siteCommands];
    }
    // When not searching, show recent first
    return [...recentCommands, ...commands, ...siteCommands];
  }, [search, commands, siteCommands, recentCommands]);

  // Group commands for display
  const groupedCommands = allCommands.reduce((acc, cmd) => {
    const group = cmd.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Badge variant styles
  const badgeStyles = {
    danger: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    success: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Command Palette */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-2xl"
            >
              <Command
                className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                shouldFilter={true}
              >
                {/* Search Input */}
                <div className="flex items-center border-b border-slate-200 px-4">
                  <Search className="h-5 w-5 text-text-tertiary mr-3" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search sites, pages, or actions..."
                    className="flex-1 py-4 text-base text-text-primary placeholder:text-text-tertiary bg-transparent border-none outline-none"
                    autoFocus
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary bg-slate-100 border border-slate-200 rounded">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>

                {/* Command List */}
                <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                  <Command.Empty className="py-12 text-center">
                    <div className="text-text-tertiary mb-2">
                      <Search className="h-8 w-8 mx-auto opacity-50" />
                    </div>
                    <p className="text-sm text-text-secondary">No results found for "{search}"</p>
                    <p className="text-xs text-text-tertiary mt-1">Try searching for a site name or action</p>
                  </Command.Empty>

                  {Object.entries(groupedCommands).map(([group, items]) => (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                    >
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.id}
                            value={`${item.label} ${item.description} ${item.keywords?.join(' ')}`}
                            onSelect={() => item.action()}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all data-[selected=true]:bg-primary/10 group mb-0.5"
                          >
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 group-data-[selected=true]:bg-primary/20 transition-colors flex-shrink-0">
                              <Icon className="h-4 w-4 text-text-secondary group-data-[selected=true]:text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-text-primary group-data-[selected=true]:text-primary truncate">
                                  {item.label}
                                </p>
                                {item.badge && (
                                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${badgeStyles[item.badge.variant]}`}>
                                    {item.badge.text}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-text-tertiary truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            {item.shortcut && (
                              <div className="flex-shrink-0 hidden sm:flex items-center gap-1">
                                {item.shortcut.split(' ').map((key, i) => (
                                  <kbd
                                    key={i}
                                    className="px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-slate-100 border border-slate-200 rounded"
                                  >
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            )}
                            <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 group-data-[selected=true]:opacity-100 transition-opacity flex-shrink-0" />
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  ))}
                </Command.List>

                {/* Footer */}
                <div className="border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-text-tertiary bg-slate-50">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↑↓</kbd>
                      <span>Navigate</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↵</kbd>
                      <span>Select</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">esc</kbd>
                      <span>Close</span>
                    </span>
                  </div>
                  <div className="text-text-tertiary">
                    <span className="hidden sm:inline">Press </span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] mx-0.5">G</kbd>
                    <span> then </span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] mx-0.5">D</kbd>
                    <span className="hidden sm:inline"> for quick nav</span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
              onClick={() => setShowShortcuts(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[80vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Keyboard Shortcuts
                  </h2>
                  <button
                    onClick={() => setShowShortcuts(false)}
                    className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                    aria-label="Close"
                  >
                    <XCircle className="h-5 w-5 text-text-tertiary" />
                  </button>
                </div>

                {/* Shortcuts List */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
                  {/* Global */}
                  <div>
                    <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                      Global
                    </h3>
                    <div className="space-y-2">
                      <ShortcutRow keys={['⌘', 'K']} description="Open command palette" />
                      <ShortcutRow keys={['?']} description="Show keyboard shortcuts" />
                      <ShortcutRow keys={['Esc']} description="Close modals & dialogs" />
                    </div>
                  </div>

                  {/* Navigation */}
                  <div>
                    <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                      Navigation (press G, then...)
                    </h3>
                    <div className="space-y-2">
                      <ShortcutRow keys={['G', 'D']} description="Go to Dashboard" />
                      <ShortcutRow keys={['G', 'S']} description="Go to Sites" />
                      <ShortcutRow keys={['G', 'L']} description="Go to Deadlines" />
                      <ShortcutRow keys={['G', 'E']} description="Go to Evidence" />
                      <ShortcutRow keys={['G', 'P']} description="Go to Packs" />
                      <ShortcutRow keys={['G', 'R']} description="Go to Reports" />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                      Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <ShortcutRow keys={['⌘', '⇧', 'D']} description="Upload Document" />
                      <ShortcutRow keys={['⌘', '⇧', 'E']} description="Upload Evidence" />
                      <ShortcutRow keys={['⌘', '⇧', 'P']} description="Generate Pack" />
                    </div>
                  </div>

                  {/* Command Palette */}
                  <div>
                    <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                      In Command Palette
                    </h3>
                    <div className="space-y-2">
                      <ShortcutRow keys={['↑', '↓']} description="Navigate options" />
                      <ShortcutRow keys={['↵']} description="Select option" />
                      <ShortcutRow keys={['Esc']} description="Close palette" />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
                  <p className="text-xs text-text-tertiary text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] mx-0.5">Esc</kbd> to close
                  </p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper component for shortcut rows
function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-secondary">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 text-xs font-mono text-text-secondary bg-slate-100 border border-slate-200 rounded min-w-[24px] text-center"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
