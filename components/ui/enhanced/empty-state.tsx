import React from 'react';
import { LucideIcon, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  illustration?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      {/* Illustration or Icon */}
      {illustration ? (
        <img
          src={illustration}
          alt=""
          className="w-64 h-64 mb-8 opacity-80"
          loading="lazy"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-6 shadow-card">
          <Icon className="h-12 w-12 text-primary" />
        </div>
      )}

      {/* Text Content */}
      <h3 className="text-2xl font-bold text-text-primary mb-2 text-center">
        {title}
      </h3>
      <p className="text-text-secondary text-center max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {action && (
          <Button
            variant="primary"
            size="lg"
            icon={action.icon}
            onClick={action.onClick}
            className="shadow-primary-glow"
          >
            {action.label}
          </Button>
        )}

        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className="flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}
