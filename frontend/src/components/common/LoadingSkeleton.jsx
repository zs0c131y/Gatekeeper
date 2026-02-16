import { cn } from '@/lib/utils';

/**
 * Loading skeleton component with pulse animation
 * @param {string} variant - 'card', 'table', 'chart', 'text'
 * @param {number} count - Number of skeleton items to render (for table/text variants)
 * @param {string} className - Additional CSS classes
 */
export function LoadingSkeleton({ variant = 'card', count = 3, className }) {
  const baseClass = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded-lg';

  if (variant === 'card') {
    return (
      <div className={cn('p-6 space-y-4', baseClass, className)}>
        <div className="h-4 bg-white/10 rounded w-1/3"></div>
        <div className="h-8 bg-white/10 rounded w-1/2"></div>
        <div className="h-3 bg-white/10 rounded w-2/3"></div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Table header */}
        <div className="flex gap-4 pb-3 border-b border-white/10">
          <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
          <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
          <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
          <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
        </div>
        {/* Table rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
            <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
            <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
            <div className={cn('h-4 rounded w-1/4', baseClass)}></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className={cn('h-6 rounded w-1/3', baseClass)}></div>
        <div className={cn('h-64 rounded', baseClass)}></div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn('h-4 rounded', baseClass)} style={{ width: `${Math.random() * 40 + 60}%` }}></div>
        ))}
      </div>
    );
  }

  if (variant === 'metric') {
    return (
      <div className={cn('p-6 space-y-4', baseClass, className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-white/10 rounded w-1/3"></div>
            <div className="h-8 bg-white/10 rounded w-1/2"></div>
          </div>
          <div className="h-10 w-10 bg-white/10 rounded-lg"></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-white/10 rounded w-1/4"></div>
          <div className="h-8 w-20 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-32 rounded-lg', baseClass, className)}></div>
  );
}

/**
 * Skeleton for metric cards grid
 */
export function MetricCardsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <LoadingSkeleton key={i} variant="metric" />
      ))}
    </div>
  );
}

/**
 * Skeleton for chart section
 */
export function ChartLoading() {
  return (
    <div className="bg-[#111111] border border-white/10 rounded-lg p-6">
      <LoadingSkeleton variant="chart" />
    </div>
  );
}

/**
 * Skeleton for table
 */
export function TableLoading({ rows = 5 }) {
  return (
    <div className="bg-[#111111] border border-white/10 rounded-lg p-6">
      <LoadingSkeleton variant="table" count={rows} />
    </div>
  );
}
