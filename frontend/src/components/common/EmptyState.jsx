import { Database, Inbox, Search, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Empty state component for when no data is available
 * @param {string} message - Message to display
 * @param {string} icon - Icon type: 'database', 'inbox', 'search', 'file'
 * @param {string} description - Additional description text
 * @param {ReactNode} action - Optional action button
 * @param {string} className - Additional CSS classes
 */
export function EmptyState({ 
  message = 'No data available', 
  icon = 'database',
  description,
  action,
  className 
}) {
  const IconComponent = {
    database: Database,
    inbox: Inbox,
    search: Search,
    file: FileX,
  }[icon] || Database;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-lg',
      className
    )}>
      <IconComponent className="w-16 h-16 text-gray-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-400 mb-2">{message}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-md mb-4">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Inline empty state (smaller variant)
 */
export function InlineEmpty({ message = 'No data', icon = 'inbox', className }) {
  const IconComponent = {
    database: Database,
    inbox: Inbox,
    search: Search,
    file: FileX,
  }[icon] || Inbox;

  return (
    <div className={cn('flex items-center justify-center gap-2 p-6 text-gray-500', className)}>
      <IconComponent className="w-5 h-5" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
