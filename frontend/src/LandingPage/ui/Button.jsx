import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            variant: {
                primary: 'bg-primary text-background hover:bg-primary-light glow-amber',
                secondary: 'bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-border-hover',
                ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface',
                outline: 'border border-border text-text-primary hover:border-primary hover:text-primary bg-transparent',
            },
            size: {
                sm: 'px-4 py-2 text-sm',
                md: 'px-6 py-3 text-base',
                lg: 'px-8 py-4 text-lg',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

export function Button({
    children,
    variant,
    size,
    className,
    ...props
}) {
    return (
        <button
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        >
            {children}
        </button>
    );
}
