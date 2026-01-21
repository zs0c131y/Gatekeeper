import { cn } from '../../lib/utils';

export function Section({
    children,
    className,
    id,
    ...props
}) {
    return (
        <section
            id={id}
            className={cn(
                'py-24 md:py-40 px-4 md:px-8 w-full overflow-hidden',
                className
            )}
            {...props}
        >
            <div className="w-full max-w-7xl mx-auto">
                {children}
            </div>
        </section>
    );
}

export function SectionHeader({
    title,
    subtitle,
    centered = true,
    className
}) {
    return (
        <div className={cn('mb-16 md:mb-20', centered && 'text-center', className)}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary mb-6">
                {title}
            </h2>
            {subtitle && (
                <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
