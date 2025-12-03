'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
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
  Calendar,
  AlertTriangle,
  Share2,
} from 'lucide-react';
import { useModuleActivation } from '@/lib/hooks/use-module-activation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Obligations', href: '/dashboard/obligations', icon: ClipboardList },
  { name: 'Evidence', href: '/dashboard/evidence', icon: FolderOpen },
  { name: 'Recurring Tasks', href: '/dashboard/recurring-tasks', icon: Calendar },
  { name: 'Recurrence Events', href: '/dashboard/recurrence-events', icon: Calendar },
  { name: 'Trigger Rules', href: '/dashboard/recurrence-trigger-rules', icon: Settings },
  { name: 'Expiring Evidence', href: '/dashboard/evidence/expiring', icon: AlertTriangle },
  { name: 'Packs', href: '/dashboard/packs', icon: Package },
  { name: 'Pack Sharing', href: '/dashboard/pack-sharing', icon: Share2 },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const getModule2Navigation = (siteId: string | null) => [
  { name: 'Parameters', href: siteId ? `/dashboard/sites/${siteId}/module-2/parameters` : '#', icon: Beaker, badge: 'Module 2' },
  { name: 'Lab Results', href: siteId ? `/dashboard/sites/${siteId}/module-2/lab-results` : '#', icon: TestTube, badge: 'Module 2' },
];

const getModule3Navigation = (siteId: string | null) => [
  { name: 'Generators', href: siteId ? `/dashboard/sites/${siteId}/module-3/generators` : '#', icon: Zap, badge: 'Module 3' },
  { name: 'Run Hours', href: siteId ? `/dashboard/sites/${siteId}/module-3/run-hours` : '#', icon: Clock, badge: 'Module 3' },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: isModule2Active } = useModuleActivation('MODULE_2');
  const { data: isModule3Active } = useModuleActivation('MODULE_3');

  const siteIdMatch = pathname?.match(/\/sites\/([^/]+)/);
  const currentSiteId = siteIdMatch ? siteIdMatch[1] : null;

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-charcoal border-b border-border-gray flex items-center justify-between px-4 z-40">
        <h1 className="text-xl font-bold text-white">EcoComply</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white p-2 hover:bg-border-gray rounded-md transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={closeMenu}
          />
        )}
      </AnimatePresence>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="md:hidden fixed left-0 top-16 bottom-0 w-80 max-w-[85vw] bg-charcoal border-r border-border-gray z-40 overflow-y-auto"
          >
            <nav className="p-4 space-y-1">
              {/* Main Navigation */}
              {navigation.map((item, index) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all',
                        isActive
                          ? 'bg-primary text-white shadow-primary-glow'
                          : 'text-white hover:bg-border-gray active:scale-95'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  </motion.div>
                );
              })}

              {/* Module 2 Navigation */}
              {isModule2Active && currentSiteId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: navigation.length * 0.05 }}
                  className="pt-4 mt-4 border-t border-border-gray"
                >
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Trade Effluent
                  </p>
                  {getModule2Navigation(currentSiteId).map((item, index) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (navigation.length + index) * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className={cn(
                            'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all',
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-white hover:bg-border-gray active:scale-95'
                          )}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                          {item.badge && (
                            <span className="ml-auto text-xs bg-primary-light/20 text-primary-light px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Module 3 Navigation */}
              {isModule3Active && currentSiteId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (navigation.length + 2) * 0.05 }}
                  className="pt-4 mt-4 border-t border-border-gray"
                >
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    MCPD/Generators
                  </p>
                  {getModule3Navigation(currentSiteId).map((item, index) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (navigation.length + 2 + index) * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className={cn(
                            'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all',
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-white hover:bg-border-gray active:scale-95'
                          )}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                          {item.badge && (
                            <span className="ml-auto text-xs bg-primary-light/20 text-primary-light px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
