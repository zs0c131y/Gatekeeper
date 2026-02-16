import { useState, useEffect } from 'react';
import { Search, Filter, X, Copy, Eye, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '../../hooks/useApi';
import { api } from '../../utils/api';
import { TableLoading } from '../../components/common/LoadingSkeleton';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EmptyState } from '../../components/common/EmptyState';

const quickFilters = [
    { label: 'Errors only', value: 'errors' },
    { label: 'Slow requests >1s', value: 'slow' },
    { label: 'Last hour', value: 'hour' },
];

function LogDetailModal({ log, onClose }) {
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (log?.trace_id) {
            setLoading(true);
            api.getLogByTraceId(log.trace_id)
                .then(data => setDetailData(data))
                .catch(err => console.error('Failed to fetch log details:', err))
                .finally(() => setLoading(false));
        }
    }, [log]);

    if (!log) return null;

    const displayLog = detailData || log;
    const statusCode = displayLog.status_code || displayLog.status;
    const latencyMs = displayLog.latency_ms || displayLog.latency;
    const clientIp = displayLog.client_ip || displayLog.clientIp;
    const traceId = displayLog.trace_id || displayLog.traceId;

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

                {loading ? (
                    <div className="p-6">
                        <TableLoading rows={3} />
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        {/* Request Details */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Request Details</h3>
                            <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Method:</span>
                                    <span className={cn(
                                        "font-semibold px-2 py-0.5 rounded",
                                        displayLog.method === 'GET' && "bg-blue-500/20 text-blue-400",
                                        displayLog.method === 'POST' && "bg-green-500/20 text-green-400",
                                        displayLog.method === 'PUT' && "bg-amber-500/20 text-amber-400",
                                        displayLog.method === 'DELETE' && "bg-red-500/20 text-red-400"
                                    )}>
                                        {displayLog.method}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Endpoint:</span>
                                    <span className="text-white font-mono">{displayLog.endpoint}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Client IP:</span>
                                    <span className="text-white font-mono">{clientIp}</span>
                                </div>
                                {displayLog.user_id && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">User ID:</span>
                                        <span className="text-white font-mono">{displayLog.user_id}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Timestamp:</span>
                                    <span className="text-white">{new Date(displayLog.timestamp).toLocaleString()}</span>
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
                                        statusCode >= 200 && statusCode < 300 && "bg-green-500/20 text-green-400",
                                        statusCode >= 300 && statusCode < 400 && "bg-blue-500/20 text-blue-400",
                                        statusCode >= 400 && statusCode < 500 && "bg-amber-500/20 text-amber-400",
                                        statusCode >= 500 && "bg-red-500/20 text-red-400"
                                    )}>
                                        {statusCode}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Latency:</span>
                                    <span className={cn(
                                        "font-semibold",
                                        latencyMs < 100 ? "text-green-400" : latencyMs < 300 ? "text-amber-400" : "text-red-400"
                                    )}>
                                        {latencyMs}ms
                                    </span>
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
                                        <span className="text-white font-mono">{traceId}</span>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(traceId)}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                        >
                                            <Copy className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Details (if error) */}
                        {statusCode >= 400 && displayLog.error_message && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Error Details</h3>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="text-red-400 font-semibold">
                                        {statusCode >= 500 ? 'Internal Server Error' : 'Client Error'}
                                    </div>
                                    <div className="text-gray-300">
                                        {displayLog.error_message}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Logs() {
    const [selectedLog, setSelectedLog] = useState(null);
    const [liveUpdates, setLiveUpdates] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [filters, setFilters] = useState({
        trace_id: '',
        method: '',
        status: '',
        endpoint: '',
        from: '',
        to: ''
    });

    // Build query params
    const queryParams = {
        page,
        limit,
        ...Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
        )
    };

    // Fetch logs with filters
    const { data: logsData, loading, error, refetch } = useApi(
        () => api.getLogs(queryParams),
        [page, limit, JSON.stringify(filters)]
    );

    // Auto-refresh for live updates
    useEffect(() => {
        if (!liveUpdates || isPaused) return;
        
        const interval = setInterval(() => {
            refetch();
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [liveUpdates, isPaused, refetch]);

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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page when filters change
    };

    const handleClearFilters = () => {
        setFilters({
            trace_id: '',
            method: '',
            status: '',
            endpoint: '',
            from: '',
            to: ''
        });
        setPage(1);
    };

    const logs = logsData?.logs || [];
    const pagination = logsData?.pagination || { total: 0, totalPages: 0, page: 1, limit: 25 };

    return (
        <div className="space-y-6">
            {/* Filter Panel */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Search by Trace ID..."
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.trace_id}
                        onChange={(e) => handleFilterChange('trace_id', e.target.value)}
                    />
                    
                    <select
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.method}
                        onChange={(e) => handleFilterChange('method', e.target.value)}
                    >
                        <option value="">All Methods</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>

                    <select
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="">All Status Codes</option>
                        <option value="200">200 OK</option>
                        <option value="400">400 Bad Request</option>
                        <option value="401">401 Unauthorized</option>
                        <option value="404">404 Not Found</option>
                        <option value="500">500 Server Error</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Filter by endpoint..."
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filters.endpoint}
                        onChange={(e) => handleFilterChange('endpoint', e.target.value)}
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
                        <button 
                            onClick={handleClearFilters}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
                        >
                            Clear Filters
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
                            <span className="text-sm text-gray-400">Live Updates:</span>
                            <button
                                onClick={() => setLiveUpdates(!liveUpdates)}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors",
                                    liveUpdates ? "bg-amber-500" : "bg-gray-600"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                    liveUpdates ? "left-7" : "left-1"
                                )}></div>
                            </button>
                        </div>
                        {liveUpdates && (
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
                    {loading ? (
                        <div className="p-6">
                            <TableLoading rows={limit} />
                        </div>
                    ) : error ? (
                        <div className="p-6">
                            <ErrorMessage error={error} onRetry={refetch} />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-6">
                            <EmptyState message="No logs found" description="Try adjusting your filters or time range" icon="search" />
                        </div>
                    ) : (
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
                                {logs.map((log, idx) => (
                                    <tr 
                                        key={log.trace_id || idx}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => setSelectedLog(log)}
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
                                            <span className={cn("px-2 py-1 rounded text-xs font-semibold", getStatusColor(log.status_code))}>
                                                {log.status_code}
                                            </span>
                                        </td>
                                        <td className={cn("px-4 py-3 text-right font-medium", getLatencyColor(log.latency_ms))}>
                                            {log.latency_ms}ms
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">{log.client_ip}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 font-mono text-xs">{log.trace_id}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(log.trace_id);
                                                    }}
                                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                                >
                                                    <Copy className="w-3 h-3 text-gray-500" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedLog(log);
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-gray-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && logs.length > 0 && (
                    <div className="p-4 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Show:</span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-400">
                                Showing {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)} of {pagination.total}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                            page === pageNum
                                                ? "bg-amber-500 text-black"
                                                : "bg-white/5 text-white hover:bg-white/10"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                                disabled={page === pagination.totalPages}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Log Detail Modal */}
            {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </div>
    );
}
