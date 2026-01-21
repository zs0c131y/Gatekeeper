import { cn } from '../../lib/utils';

export function Card({
    children,
    className,
    hover = true,
    glow = false,
    ...props
}) {
    return (
        <div
            className={cn(
                'bg-surface border border-border rounded-2xl p-6',
                hover && 'transition-all duration-300 hover:bg-surface-hover hover:border-border-hover hover:scale-[1.02]',
                glow && 'hover:glow-amber',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function GlassCard({
    children,
    className,
    ...props
}) {
    return (
        <div
            className={cn(
                'glass rounded-2xl p-6 transition-all duration-300 hover:bg-surface-hover/70',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
