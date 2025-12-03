import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      asChild,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center rounded-md font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transform',
      'leading-normal relative overflow-hidden',
      {
        'bg-primary text-white hover:bg-primary-dark hover:shadow-primary-glow hover:scale-[1.02]': variant === 'primary',
        'bg-transparent border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-white':
          variant === 'secondary',
        'border border-primary text-primary hover:bg-primary/10 hover:border-primary-dark':
          variant === 'outline',
        'text-text-primary hover:bg-background-secondary': variant === 'ghost',
        'bg-danger text-white hover:bg-red-700 hover:shadow-lg': variant === 'danger',
        'bg-transparent text-primary hover:text-primary-dark underline-offset-4 hover:underline':
          variant === 'link',
        'h-8 px-4 py-2 text-sm': size === 'sm',
        'h-10 px-6 py-3 text-base': size === 'md',
        'h-12 px-8 py-4 text-lg': size === 'lg',
        'w-full': fullWidth,
      },
      className
    );

    const isDisabled = disabled || loading;

    // Render icon or loading spinner
    const renderIcon = () => {
      if (loading) {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
      if (icon) {
        return <span className={cn('flex-shrink-0', iconPosition === 'left' ? 'mr-2' : 'ml-2')}>{icon}</span>;
      }
      return null;
    };

    // Render content with icon
    const renderContent = () => {
      if (loading && !icon) {
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {children}
          </>
        );
      }

      if (icon && iconPosition === 'left') {
        return (
          <>
            {renderIcon()}
            {children}
          </>
        );
      }

      if (icon && iconPosition === 'right') {
        return (
          <>
            {children}
            {renderIcon()}
          </>
        );
      }

      return children;
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(baseClasses, (children as any).props?.className),
        ref,
        disabled: isDisabled,
        ...props,
      });
    }

    return (
      <button
        className={baseClasses}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };

