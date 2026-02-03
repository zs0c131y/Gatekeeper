import { Search, Bell, User, ChevronRight, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

const breadcrumbMap = {
    '/dashboard': ['Dashboard', 'Overview'],
    '/dashboard/analytics': ['Dashboard', 'Analytics'],
    '/dashboard/logs': ['Dashboard', 'Logs'],
    '/dashboard/settings': ['Dashboard', 'Settings'],
};

export function TopBar({ sidebarCollapsed }) {
    const location = useLocation();
    const breadcrumbs = breadcrumbMap[location.pathname] || ['Dashboard'];

    return (
        <header className="h-16 bg-[#0a0a0a] border-b border-white/10 flex items-center px-6 gap-6 sticky top-0 z-40">
            {/* Logo (when sidebar collapsed) & Breadcrumbs */}
            <div className="flex items-center gap-4 flex-1">
                {sidebarCollapsed && (
                    <a href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center hover:opacity-80 transition-opacity">
                        <Zap className="w-5 h-5 text-black" />
                    </a>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className={cn(
                                index === breadcrumbs.length - 1 
                                    ? 'text-white font-medium' 
                                    : 'text-gray-400'
                            )}>
                                {crumb}
                            </span>
                            {index < breadcrumbs.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                    />
                </div>
            </div>

            {/* Right Side - Notifications & Profile */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-black" />
                    </div>
                    <div className="text-sm">
                        <div className="text-white font-medium">Admin</div>
                        <div className="text-gray-400 text-xs">admin@gatekeeper.io</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
