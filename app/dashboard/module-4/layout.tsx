'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trash2, FileText, Shield, Settings, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Module4Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard/module-4/waste-streams',
      label: 'Waste Streams',
      icon: Trash2,
    },
    {
      href: '/dashboard/module-4/consignment-notes',
      label: 'Consignment Notes',
      icon: FileText,
    },
    {
      href: '/dashboard/module-4/contractor-licences',
      label: 'Contractor Licences',
      icon: Shield,
    },
    {
      href: '/dashboard/module-4/chain-break-alerts',
      label: 'Chain Break Alerts',
      icon: AlertTriangle,
    },
    {
      href: '/dashboard/module-4/end-point-proofs',
      label: 'End-Point Proofs',
      icon: CheckCircle2,
    },
    {
      href: '/dashboard/module-4/validation-rules',
      label: 'Validation Rules',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Module 4 Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}

