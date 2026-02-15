import { useState } from 'react';
import { Search, Filter, X, Copy, Eye, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Mock log data
const generateLogs = () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const endpoints = ['/api/users', '/api/products', '/api/orders', '/api/auth/login', '/api/cart'];
    const statuses = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
    
    return Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        method: methods[Math.floor(Math.random() * methods.length)],
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        latency: Math.floor(Math.random() * 500) + 10,
        clientIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        traceId: `trace-${Math.random().toString(36).substr(2, 9)}`
    }));
};

const quickFilters = [
    { label: 'Errors only', value: 'errors' },
    { label: 'Slow requests >1s', value: 'slow' },
    { label: 'Last hour', value: 'hour' },
];

function LogDetailModal({ log, onClose }) {
    if (!log) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#111111] border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-[#111111] border-b border-white/10 p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Request Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Request Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Request Details</h3>
                        <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Method:</span>
                                <span className={cn(
                                    "font-semibold px-2 py-0.5 rounded",
                                    log.method === 'GET' && "bg-blue-500/20 text-blue-400",
                                    log.method === 'POST' && "bg-green-500/20 text-green-400",
                                    log.method === 'PUT' && "bg-amber-500/20 text-amber-400",
                                    log.method === 'DELETE' && "bg-red-500/20 text-red-400"
                                )}>
                                    {log.method}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Endpoint:</span>
                                <span className="text-white font-mono">{log.endpoint}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Client IP:</span>
                                <span className="text-white font-mono">{log.clientIp}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Timestamp:</span>
                                <span className="text-white">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Response Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Response Details</h3>
                        <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Status Code:</span>
                                <span className={cn(
                                    "font-semibold px-2 py-0.5 rounded",
                                    log.status >= 200 && log.status < 300 && "bg-green-500/20 text-green-400",
                                    log.status >= 300 && log.status < 400 && "bg-blue-500/20 text-blue-400",
                                    log.status >= 400 && log.status < 500 && "bg-amber-500/20 text-amber-400",
                                    log.status >= 500 && "bg-red-500/20 text-red-400"
                                )}>
                                    {log.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Latency:</span>
                                <span className={cn(
                                    "font-semibold",
                                    log.latency < 100 ? "text-green-400" : log.latency < 300 ? "text-amber-400" : "text-red-400"
                                )}>
                                    {log.latency}ms
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Gateway Overhead:</span>
                                <span className="text-white">12ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Backend Processing:</span>
                                <span className="text-white">{log.latency - 12}ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Trace Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Trace Information</h3>
                        <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Trace ID:</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-mono">{log.traceId}</span>
                                    <button className="p-1 hover:bg-white/10 rounded transition-colors">
                                        <Copy className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="text-gray-400 mb-2">Request Timeline:</div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        <span className="text-white text-xs">Gateway received request</span>
                                        <span className="text-gray-500 text-xs ml-auto">0ms</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                        <span className="text-white text-xs">Backend processing</span>
                                        <span className="text-gray-500 text-xs ml-auto">12ms</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                        <span className="text-white text-xs">Response sent</span>
                                        <span className="text-gray-500 text-xs ml-auto">{log.latency}ms</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Details (if error) */}
                    {log.status >= 400 && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Error Details</h3>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2 text-sm">
                                <div className="text-red-400 font-semibold">
                                    {log.status >= 500 ? 'Internal Server Error' : 'Client Error'}
                                </div>
                                <div className="text-gray-300">
                                    {log.status >= 500 
                                        ? 'The backend service encountered an error while processing this request.'
                                        : 'The request was invalid or unauthorized.'
                                    }
                                </div>
                                <div className="mt-3">
                                    <div className="text-gray-400 text-xs mb-1">Suggested Resolution:</div>
                                    <div className="text-gray-300 text-xs">
                                        {log.status >= 500 
                                            ? '• Check backend service logs\n• Verify service health\n• Review circuit breaker status'
                                            : '• Verify request parameters\n• Check authentication\n• Review API documentation'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function Logs() {
    const [logs, setLogs] = useState(generateLogs());
    const [selectedLog, setSelectedLog] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [filters, setFilters] = useState({
        search: '',
        method: '',
        status: '',
        endpoint: ''
    });

    const getMethodColor = (method) => {
        const colors = {
            'GET': 'bg-blue-500/20 text-blue-400',
            'POST': 'bg-green-500/20 text-green-400',
            'PUT': 'bg-amber-500/20 text-amber-400',
            'DELETE': 'bg-red-500/20 text-red-400',
            'PATCH': 'bg-purple-500/20 text-purple-400'
        };
        return colors[method] || 'bg-gray-500/20 text-gray-400';
    };

    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-400';
        if (status >= 300 && status < 400) return 'bg-blue-500/20 text-blue-400';
        if (status >= 400 && status < 500) return 'bg-amber-500/20 text-amber-400';
        return 'bg-red-500/20 text-red-400';
    };

    const getLatencyColor = (latency) => {
        if (latency < 100) return 'text-green-400';
        if (latency < 300) return 'text-amber-400';
        return 'text-red-400';
    };

    const totalPages = Math.ceil(logs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const displayedLogs = logs.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Filter Panel */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Search by Trace ID..."
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                    
                    <select
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.method}
                        onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                    >
                        <option value="">All Methods</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>

                    <select
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Status Codes</option>
                        <option value="2xx">2xx Success</option>
                        <option value="3xx">3xx Redirect</option>
                        <option value="4xx">4xx Client Error</option>
                        <option value="5xx">5xx Server Error</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Client IP..."
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {quickFilters.map((filter) => (
                            <button
                                key={filter.value}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors">
                            Apply Filters
                        </button>
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
                {/* Table Header with Streaming Toggle */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Request Logs</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Real-time streaming:</span>
                            <button
                                onClick={() => setIsStreaming(!isStreaming)}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors",
                                    isStreaming ? "bg-amber-500" : "bg-gray-600"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                    isStreaming ? "left-7" : "left-1"
                                )}></div>
                            </button>
                        </div>
                        {isStreaming && (
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                            >
                                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                {isPaused ? 'Resume' : 'Pause'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 sticky top-0">
                            <tr>
                                <th className="text-left text-gray-400 font-medium px-4 py-3">Timestamp</th>
                                <th className="text-left text-gray-400 font-medium px-4 py-3">Method</th>
                                <th className="text-left text-gray-400 font-medium px-4 py-3">Endpoint</th>
                                <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                                <th className="text-right text-gray-400 font-medium px-4 py-3">Latency</th>
                                <th className="text-left text-gray-400 font-medium px-4 py-3">Client IP</th>
                                <th className="text-left text-gray-400 font-medium px-4 py-3">Trace ID</th>
                                <th className="text-center text-gray-400 font-medium px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedLogs.map((log) => (
                                <tr 
                                    key={log.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-4 py-3 text-gray-300">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn("px-2 py-1 rounded text-xs font-semibold", getMethodColor(log.method))}>
                                            {log.method}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-white font-mono text-xs">{log.endpoint}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn("px-2 py-1 rounded text-xs font-semibold", getStatusColor(log.status))}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className={cn("px-4 py-3 text-right font-medium", getLatencyColor(log.latency))}>
                                        {log.latency}ms
                                    </td>
                                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{log.clientIp}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-mono text-xs">{log.traceId}</span>
                                            <button className="p-1 hover:bg-white/10 rounded transition-colors">
                                                <Copy className="w-3 h-3 text-gray-500" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        >
                                            <Eye className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-400">
                            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, logs.length)} of {logs.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                    currentPage === page
                                        ? "bg-amber-500 text-black"
                                        : "bg-white/5 text-white hover:bg-white/10"
                                )}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Detail Modal */}
            {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </div>
    );
}
