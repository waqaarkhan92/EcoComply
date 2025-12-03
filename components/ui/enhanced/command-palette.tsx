'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
  keywords?: string[];
  group?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  // Toggle command palette with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

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
    (path: string) => {
      setIsOpen(false);
      router.push(path);
    },
    [router]
  );

  // Define all available commands
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Go to dashboard',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard'),
      keywords: ['home', 'overview'],
      group: 'Navigation',
    },
    {
      id: 'nav-documents',
      label: 'Documents',
      description: 'View all documents',
      icon: FileText,
      action: () => navigate('/dashboard/documents'),
      keywords: ['permits', 'files', 'pdfs'],
      group: 'Navigation',
    },
    {
      id: 'nav-obligations',
      label: 'Obligations',
      description: 'Manage compliance obligations',
      icon: ClipboardList,
      action: () => navigate('/dashboard/obligations'),
      keywords: ['tasks', 'compliance', 'requirements'],
      group: 'Navigation',
    },
    {
      id: 'nav-evidence',
      label: 'Evidence',
      description: 'View evidence library',
      icon: FolderOpen,
      action: () => navigate('/dashboard/evidence'),
      keywords: ['files', 'proof', 'attachments'],
      group: 'Navigation',
    },
    {
      id: 'nav-packs',
      label: 'Packs',
      description: 'View compliance packs',
      icon: Package,
      action: () => navigate('/dashboard/packs'),
      keywords: ['reports', 'bundles'],
      group: 'Navigation',
    },
    {
      id: 'nav-notifications',
      label: 'Notifications',
      description: 'View notifications',
      icon: Bell,
      action: () => navigate('/dashboard/notifications'),
      keywords: ['alerts', 'messages'],
      group: 'Navigation',
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'Manage settings',
      icon: Settings,
      action: () => navigate('/dashboard/settings'),
      keywords: ['preferences', 'config'],
      group: 'Navigation',
    },

    // Actions
    {
      id: 'action-upload-document',
      label: 'Upload Document',
      description: 'Upload a new permit or document',
      icon: Upload,
      action: () => navigate('/dashboard/documents/upload'),
      keywords: ['add', 'create', 'new', 'permit'],
      group: 'Actions',
    },
    {
      id: 'action-create-obligation',
      label: 'Create Obligation',
      description: 'Add a new compliance obligation',
      icon: Plus,
      action: () => navigate('/dashboard/obligations/new'),
      keywords: ['add', 'new', 'task'],
      group: 'Actions',
    },
    {
      id: 'action-generate-pack',
      label: 'Generate Pack',
      description: 'Create a new compliance pack',
      icon: Package,
      action: () => navigate('/dashboard/packs/generate'),
      keywords: ['create', 'report', 'bundle'],
      group: 'Actions',
    },

    // Modules
    {
      id: 'module2-parameters',
      label: 'Trade Effluent Parameters',
      description: 'Manage effluent parameters',
      icon: Beaker,
      action: () => navigate('/dashboard/module-2/parameters'),
      keywords: ['module 2', 'effluent', 'water'],
      group: 'Modules',
    },
    {
      id: 'module2-lab-results',
      label: 'Lab Results',
      description: 'View lab test results',
      icon: TestTube,
      action: () => navigate('/dashboard/module-2/lab-results'),
      keywords: ['module 2', 'tests', 'results'],
      group: 'Modules',
    },
    {
      id: 'module3-generators',
      label: 'Generators',
      description: 'Manage generators',
      icon: Zap,
      action: () => navigate('/dashboard/module-3/generators'),
      keywords: ['module 3', 'mcpd', 'equipment'],
      group: 'Modules',
    },
    {
      id: 'module3-run-hours',
      label: 'Run Hours',
      description: 'Log generator run hours',
      icon: Clock,
      action: () => navigate('/dashboard/module-3/run-hours'),
      keywords: ['module 3', 'hours', 'logging'],
      group: 'Modules',
    },

    // Other
    {
      id: 'recurring-tasks',
      label: 'Recurring Tasks',
      description: 'Manage recurring tasks',
      icon: Calendar,
      action: () => navigate('/dashboard/recurring-tasks'),
      keywords: ['schedule', 'repeat', 'tasks'],
      group: 'Advanced',
    },
    {
      id: 'expiring-evidence',
      label: 'Expiring Evidence',
      description: 'View evidence expiring soon',
      icon: AlertTriangle,
      action: () => navigate('/dashboard/evidence/expiring'),
      keywords: ['alerts', 'deadline', 'urgent'],
      group: 'Advanced',
    },
    {
      id: 'pack-sharing',
      label: 'Pack Sharing',
      description: 'Share packs with others',
      icon: Share2,
      action: () => navigate('/dashboard/pack-sharing'),
      keywords: ['share', 'distribute', 'access'],
      group: 'Advanced',
    },
  ];

  // Group commands
  const groupedCommands = commands.reduce((acc, cmd) => {
    const group = cmd.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Command Palette */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-2xl"
            >
              <Command
                className="bg-white rounded-xl shadow-modal border border-slate-200 overflow-hidden"
                shouldFilter={true}
              >
                {/* Search Input */}
                <div className="flex items-center border-b border-slate-200 px-4">
                  <Search className="h-5 w-5 text-text-tertiary mr-3" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search for commands, pages, or actions..."
                    className="flex-1 py-4 text-body-lg text-text-primary placeholder:text-text-tertiary bg-transparent border-none outline-none"
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-label-xs text-text-tertiary bg-slate-100 border border-slate-200 rounded">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>

                {/* Command List */}
                <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                  <Command.Empty className="py-12 text-center text-body-md text-text-secondary">
                    No results found.
                  </Command.Empty>

                  {Object.entries(groupedCommands).map(([group, items]) => (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-label-sm [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:font-semibold"
                    >
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.id}
                            value={`${item.label} ${item.description} ${item.keywords?.join(' ')}`}
                            onSelect={() => item.action()}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary group mb-1"
                          >
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 group-data-[selected=true]:bg-primary-100 transition-colors">
                              <Icon className="h-5 w-5 text-text-secondary group-data-[selected=true]:text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-body-md font-medium text-text-primary group-data-[selected=true]:text-primary">
                                {item.label}
                              </p>
                              {item.description && (
                                <p className="text-body-sm text-text-secondary truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  ))}
                </Command.List>

                {/* Footer */}
                <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between text-label-xs text-text-tertiary">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">esc</kbd>
                      Close
                    </span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
