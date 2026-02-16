import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Error message component with optional retry button
 * @param {Error} error - The error object
 * @param {Function} onRetry - Callback function for retry action
 * @param {string} className - Additional CSS classes
 * @param {string} message - Custom error message (overrides error.message)
 */
export function ErrorMessage({ error, onRetry, className, message }) {
  const errorMessage = message || error?.response?.data?.message || error?.message || 'An unexpected error occurred';

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500/20 rounded-lg',
      className
    )}>
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Data</h3>
      <p className="text-gray-400 text-center mb-6 max-w-md">{errorMessage}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Inline error message (smaller variant)
 */
export function InlineError({ error, message, className }) {
  const errorMessage = message || error?.response?.data?.message || error?.message || 'Error loading data';

  return (
    <div className={cn('flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400', className)}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{errorMessage}</span>
    </div>
  );
}
