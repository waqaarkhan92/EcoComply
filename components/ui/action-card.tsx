'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Icon to display */
  icon: ReactNode;
  /** Link destination */
  href?: string;
  /** Click handler (alternative to href) */
  onClick?: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'cta';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Show arrow indicator */
  showArrow?: boolean;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Action card component for quick actions / CTAs
 *
 * @example
 * <ActionCard
 *   title="Upload Evidence"
 *   description="Add compliance documentation"
 *   icon={<Upload className="h-5 w-5" />}
 *   href="/dashboard/evidence/upload"
 *   variant="primary"
 * />
 */
export function ActionCard({
  title,
  description,
  icon,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  showArrow = true,
  className,
  disabled = false,
}: ActionCardProps) {
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-600 text-white',
    secondary: 'bg-white border-2 border-gray-200 hover:border-primary text-text-primary hover:bg-gray-50',
    outline: 'bg-transparent border-2 border-gray-200 hover:border-primary text-text-primary hover:bg-gray-50',
    cta: 'bg-cta-primary hover:bg-cta-primary-hover text-white',
  };

  const sizeStyles = {
    sm: 'p-3 gap-2',
    md: 'p-4 gap-3',
    lg: 'p-5 gap-4',
  };

  const iconContainerSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const textClasses = variant === 'secondary' || variant === 'outline'
    ? {
        title: 'text-text-primary',
        description: 'text-text-secondary',
        arrow: 'text-primary',
      }
    : {
        title: 'text-white',
        description: 'text-white/80',
        arrow: 'text-white',
      };

  const content = (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg transition-all group',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'rounded-lg',
            iconContainerSizes[size],
            variant === 'secondary' || variant === 'outline'
              ? 'bg-primary/10 text-primary'
              : 'bg-white/20 text-white'
          )}
        >
          {icon}
        </div>
        <div className="text-left">
          <p className={cn('font-semibold', textClasses.title)}>{title}</p>
          {description && (
            <p className={cn('text-sm mt-0.5', textClasses.description)}>
              {description}
            </p>
          )}
        </div>
      </div>
      {showArrow && (
        <ArrowRight
          className={cn(
            'h-5 w-5 transition-transform group-hover:translate-x-1',
            textClasses.arrow
          )}
        />
      )}
    </div>
  );

  if (href && !disabled) {
    return <Link href={href}>{content}</Link>;
  }

  if (onClick && !disabled) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// =============================================================================
// ACTION CARD GRID
// =============================================================================

interface ActionCardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Grid layout for action cards
 */
export function ActionCardGrid({ children, columns = 2, className }: ActionCardGridProps) {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', columnStyles[columns], className)}>
      {children}
    </div>
  );
}
