'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, FileText, Package, Building2 } from 'lucide-react';

interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

interface QuickActionsFABProps {
  /** Optional site ID to use in action URLs */
  siteId?: string;
  /** Custom actions to show (overrides defaults) */
  actions?: QuickActionItem[];
}

export function QuickActionsFAB({ siteId, actions }: QuickActionsFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Default actions
  const defaultActions: QuickActionItem[] = [
    {
      id: 'upload-evidence',
      label: 'Upload Evidence',
      icon: <Upload className="h-5 w-5" />,
      href: siteId
        ? `/dashboard/sites/${siteId}/permits/evidence/upload`
        : '/dashboard/evidence/upload',
      color: 'bg-primary',
    },
    {
      id: 'upload-document',
      label: 'Upload Document',
      icon: <FileText className="h-5 w-5" />,
      href: siteId
        ? `/dashboard/sites/${siteId}/permits/documents`
        : '/dashboard/documents/upload',
      color: 'bg-blue-500',
    },
    {
      id: 'generate-pack',
      label: 'Generate Pack',
      icon: <Package className="h-5 w-5" />,
      href: '/dashboard/packs/regulatory?action=generate',
      color: 'bg-purple-500',
    },
    {
      id: 'add-site',
      label: 'Add Site',
      icon: <Building2 className="h-5 w-5" />,
      href: '/dashboard/sites/new',
      color: 'bg-green-500',
    },
  ];

  const actionItems = actions || defaultActions;

  const handleAction = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        {/* Action Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 mb-3"
            >
              {actionItems.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="flex items-center justify-end gap-3"
                >
                  {/* Label */}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className="px-3 py-1.5 bg-white rounded-lg shadow-lg text-sm font-medium text-text-primary whitespace-nowrap"
                  >
                    {action.label}
                  </motion.span>

                  {/* Icon Button */}
                  <button
                    onClick={() => handleAction(action.href)}
                    className={`
                      w-12 h-12 rounded-full shadow-lg
                      flex items-center justify-center
                      text-white
                      ${action.color}
                      active:scale-95 transition-transform
                    `}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full shadow-lg
            flex items-center justify-center
            text-white bg-primary
            active:scale-95 transition-all
            ${isOpen ? 'rotate-45' : ''}
          `}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.button>
      </div>
    </>
  );
}
