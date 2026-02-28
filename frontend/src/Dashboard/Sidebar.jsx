import {
  Home,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  UserCircle2,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

const navItems = [
  { name: "Overview", path: "/dashboard", icon: Home },
  { name: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
  { name: "Logs", path: "/dashboard/logs", icon: FileText },
  { name: "Settings", path: "/dashboard/settings", icon: Settings },
  { name: "Profile", path: "/dashboard/profile", icon: UserCircle2 },
];

export function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-[#0a0a0a] border-r border-white/10 transition-all duration-300 flex flex-col z-50 overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10">
        <a
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span
            className={cn(
              "font-bold text-lg whitespace-nowrap transition-all duration-300 overflow-hidden text-white",
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs",
            )}
          >
            Gatekeeper
          </span>
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all duration-200 outline-none",
                collapsed && "justify-center gap-0 px-0",
                isActive
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive && "text-amber-400",
                  )}
                />
                <span
                  className={cn(
                    "font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
                    collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs",
                  )}
                >
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : undefined}
        className="h-14 flex items-center justify-center gap-2 border-t border-white/10 text-gray-400 hover:text-amber-400 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 transition-all duration-300 group relative outline-none"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/5 transition-all duration-300" />
        {collapsed ? (
          <ChevronRight className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
        ) : (
          <>
            <ChevronLeft className="w-5 h-5 transform group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium whitespace-nowrap">
              Collapse
            </span>
          </>
        )}
      </button>
    </aside>
  );
}
