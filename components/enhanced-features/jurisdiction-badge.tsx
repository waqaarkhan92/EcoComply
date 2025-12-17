'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  jurisdictionConfig,
  type Jurisdiction,
} from '@/lib/utils/status';
import { Globe, Languages, Building2, Info } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface JurisdictionBadgeProps {
  /** Jurisdiction code */
  jurisdiction: Jurisdiction;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show full name or short code */
  variant?: 'full' | 'short' | 'compact';
  /** Show regulator info */
  showRegulator?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// FLAG COMPONENTS
// =============================================================================

function EnglandFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" fill="none">
      <rect width="60" height="30" fill="white" />
      <rect x="27" width="6" height="30" fill="#CF142B" />
      <rect y="12" width="60" height="6" fill="#CF142B" />
    </svg>
  );
}

function WalesFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" fill="none">
      <rect width="60" height="15" fill="white" />
      <rect y="15" width="60" height="15" fill="#00AB39" />
    </svg>
  );
}

function ScotlandFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" fill="none">
      <rect width="60" height="30" fill="#005EB8" />
      <path d="M0 0L60 30M60 0L0 30" stroke="white" strokeWidth="4" />
    </svg>
  );
}

function NIFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" fill="none">
      <rect width="60" height="30" fill="#00AB39" />
      <rect x="27" width="6" height="30" fill="white" />
      <rect y="12" width="60" height="6" fill="white" />
    </svg>
  );
}

function IrelandFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" fill="none">
      <rect width="20" height="30" fill="#169B62" />
      <rect x="20" width="20" height="30" fill="white" />
      <rect x="40" width="20" height="30" fill="#FF883E" />
    </svg>
  );
}

function getFlagComponent(jurisdiction: Jurisdiction) {
  switch (jurisdiction) {
    case 'ENGLAND':
      return EnglandFlag;
    case 'WALES':
      return WalesFlag;
    case 'SCOTLAND':
      return ScotlandFlag;
    case 'NORTHERN_IRELAND':
      return NIFlag;
    case 'REPUBLIC_OF_IRELAND':
      return IrelandFlag;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays jurisdiction with flag and optional regulator info
 *
 * @example
 * <JurisdictionBadge jurisdiction="WALES" showRegulator />
 */
export function JurisdictionBadge({
  jurisdiction,
  size = 'md',
  variant = 'full',
  showRegulator = false,
  className,
}: JurisdictionBadgeProps) {
  const config = jurisdictionConfig[jurisdiction];
  const Flag = getFlagComponent(jurisdiction);

  const sizeStyles = {
    sm: {
      badge: 'px-1.5 py-0.5 text-xs',
      flag: 'w-4 h-2.5 rounded-sm',
      icon: 'h-3 w-3',
    },
    md: {
      badge: 'px-2 py-1 text-sm',
      flag: 'w-5 h-3 rounded-sm',
      icon: 'h-4 w-4',
    },
    lg: {
      badge: 'px-2.5 py-1.5 text-base',
      flag: 'w-6 h-4 rounded',
      icon: 'h-5 w-5',
    },
  };

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded overflow-hidden border',
          sizeStyles[size].flag,
          className
        )}
        title={config.label}
      >
        <Flag className="w-full h-full" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeStyles[size].badge,
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span className={cn('overflow-hidden rounded-sm border', sizeStyles[size].flag)}>
        <Flag className="w-full h-full" />
      </span>
      <span>{variant === 'short' ? config.shortLabel : config.label}</span>
      {showRegulator && (
        <span className="text-text-tertiary">({config.regulator})</span>
      )}
      {'bilingual' in config && config.bilingual && (
        <span title="Bilingual jurisdiction"><Languages className={cn(sizeStyles[size].icon, 'text-text-tertiary')} /></span>
      )}
    </span>
  );
}

// =============================================================================
// JURISDICTION CARD
// =============================================================================

interface JurisdictionCardProps {
  jurisdiction: Jurisdiction;
  className?: string;
}

/**
 * Detailed jurisdiction information card
 */
export function JurisdictionCard({ jurisdiction, className }: JurisdictionCardProps) {
  const config = jurisdictionConfig[jurisdiction];
  const Flag = getFlagComponent(jurisdiction);

  return (
    <div className={cn('rounded-lg border p-4', config.borderColor, className)}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-5 rounded overflow-hidden border shadow-sm">
          <Flag className="w-full h-full" />
        </span>
        <div>
          <h4 className={cn('font-medium', config.textColor)}>{config.label}</h4>
          {'bilingual' in config && config.bilingual && (
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <Languages className="h-3 w-3" />
              Bilingual jurisdiction
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-text-tertiary" />
          <span className="font-medium">{config.regulator}</span>
          <span className="text-text-secondary">- {config.regulatorName}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// REGULATOR BADGE
// =============================================================================

type Regulator = 'EA' | 'NRW' | 'SEPA' | 'NIEA' | 'EPA';

interface RegulatorBadgeProps {
  regulator: Regulator;
  size?: 'sm' | 'md' | 'lg';
  showFullName?: boolean;
  className?: string;
}

const regulatorStyles: Record<Regulator, { bg: string; text: string; border: string }> = {
  EA: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  NRW: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  SEPA: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  NIEA: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  EPA: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const regulatorNames: Record<Regulator, string> = {
  EA: 'Environment Agency',
  NRW: 'Natural Resources Wales',
  SEPA: 'Scottish Environment Protection Agency',
  NIEA: 'Northern Ireland Environment Agency',
  EPA: 'Environmental Protection Agency',
};

/**
 * Badge showing regulator information
 */
export function RegulatorBadge({
  regulator,
  size = 'md',
  showFullName = false,
  className,
}: RegulatorBadgeProps) {
  const styles = regulatorStyles[regulator];

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        sizeStyles[size],
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
      title={regulatorNames[regulator]}
    >
      <Building2 className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      <span>{showFullName ? regulatorNames[regulator] : regulator}</span>
    </span>
  );
}

// =============================================================================
// JURISDICTION SELECTOR
// =============================================================================

interface JurisdictionSelectorProps {
  value?: Jurisdiction;
  onChange: (jurisdiction: Jurisdiction) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Visual selector for jurisdictions
 */
export function JurisdictionSelector({
  value,
  onChange,
  disabled = false,
  className,
}: JurisdictionSelectorProps) {
  const jurisdictions: Jurisdiction[] = [
    'ENGLAND',
    'WALES',
    'SCOTLAND',
    'NORTHERN_IRELAND',
    'REPUBLIC_OF_IRELAND',
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {jurisdictions.map((j) => {
        const config = jurisdictionConfig[j];
        const Flag = getFlagComponent(j);
        const isSelected = value === j;

        return (
          <button
            key={j}
            onClick={() => onChange(j)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              isSelected
                ? cn(config.bgColor, config.borderColor, config.textColor)
                : 'border-gray-200 hover:border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="w-5 h-3 rounded-sm overflow-hidden border shadow-sm">
              <Flag className="w-full h-full" />
            </span>
            <span className="text-sm font-medium">{config.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
