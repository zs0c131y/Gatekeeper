import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, Server } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '../../hooks/useApi';
import { api } from '../../utils/api';
import { MetricCardsLoading, ChartLoading, TableLoading } from '../../components/common/LoadingSkeleton';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EmptyState } from '../../components/common/EmptyState';

function MetricCard({ title, value, change, trend, icon: Icon, color }) {
    const isPositive = change && parseFloat(change) > 0;
    
    return (
        <Card className="bg-[#111111] border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">{title}</p>
                        <h3 className={cn(
                            "text-3xl font-bold",
                            color === 'green' && 'text-green-400',
                            color === 'amber' && 'text-amber-400',
                            color === 'red' && 'text-red-400',
                            !color && 'text-white'
                        )}>
                            {value}
                        </h3>
                    </div>
                    <div className={cn(
                        "p-2 rounded-lg",
                        color === 'green' && 'bg-green-500/10',
                        color === 'amber' && 'bg-amber-500/10',
                        color === 'red' && 'bg-red-500/10',
                        !color && 'bg-white/5'
                    )}>
                        <Icon className={cn(
                            "w-5 h-5",
                            color === 'green' && 'text-green-400',
                            color === 'amber' && 'text-amber-400',
                            color === 'red' && 'text-red-400',
                            !color && 'text-white'
                        )} />
                    </div>
                </div>
            
            {change && (
                <div className="flex items-center gap-2">
                    {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={cn(
                        "text-sm font-medium",
                        isPositive ? 'text-green-400' : 'text-red-400'
                    )}>
                        {change}
                    </span>
                    <span className="text-gray-500 text-xs">{trend}</span>
                </div>
            )}
            </CardContent>
        </Card>
    );
}

export function Overview() {
    const { data: overviewData, loading, error, refetch } = useApi(() => api.getOverview());
    const [isPaused, setIsPaused] = useState(false);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (isPaused) return;
        
        const interval = setInterval(() => {
            refetch();
        }, 30000);

        return () => clearInterval(interval);
    }, [isPaused, refetch]);

    const getLatencyColor = (latency) => {
        if (latency < 50) return 'text-green-400';
        if (latency < 100) return 'text-amber-400';
        return 'text-red-400';
    };

    const getErrorRateColor = (rate) => {
        if (rate < 1) return 'text-green-400';
        if (rate < 2) return 'text-amber-400';
        return 'text-red-400';
    };

    // Show loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <MetricCardsLoading />
                <ChartLoading />
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <TableLoading rows={10} />
                    <div className="lg:col-span-2 space-y-6">
                        <ChartLoading />
                        <ChartLoading />
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return <ErrorMessage error={error} onRetry={refetch} />;
    }

    // Show empty state if no data
    if (!overviewData) {
        return <EmptyState message="No overview data available" />;
    }

    const getLatencyColor = (latency) => {
        if (latency < 50) return 'text-green-400';
        if (latency < 100) return 'text-amber-400';
        return 'text-red-400';
    };

    const getErrorRateColor = (rate) => {
        if (rate < 1) return 'text-green-400';
        if (rate < 2) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Requests"
                    value={overviewData.totalRequests?.toLocaleString() || '0'}
                    change={overviewData.requestsChange}
                    trend="vs last hour"
                    icon={Activity}
                />
                <MetricCard
                    title="Avg Latency"
                    value={`${overviewData.avgLatency || 0}ms`}
                    change={overviewData.latencyChange}
                    trend="vs last hour"
                    icon={Clock}
                    color="green"
                />
                <MetricCard
                    title="Error Rate"
                    value={`${overviewData.errorRate || 0}%`}
                    change={overviewData.errorRateChange}
                    trend="vs last hour"
                    icon={AlertTriangle}
                    color={overviewData.errorRate < 1 ? 'green' : overviewData.errorRate < 2 ? 'amber' : 'red'}
                />
                <MetricCard
                    title="Active Backends"
                    value={`${overviewData.activeBackends || 0}/${overviewData.backends?.length || 0}`}
                    change={overviewData.backendsChange}
                    trend={overviewData.activeBackends === overviewData.backends?.length ? 'all healthy' : 'degraded'}
                    icon={Server}
                    color={overviewData.activeBackends === overviewData.backends?.length ? 'green' : 'red'}
                />
            </div>

            {/* Live Traffic Chart */}
            <Card className="bg-[#111111] border-white/10">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle>Traffic Overview</CardTitle>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    !loading ? "bg-green-400 animate-pulse" : "bg-red-400"
                                )}></div>
                                <span className="text-sm text-gray-400">
                                    {!loading ? 'Connected' : 'Loading...'}
                                </span>
                            </div>
                            <Button
                                onClick={() => setIsPaused(!isPaused)}
                                variant="outline"
                                size="sm"
                                className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
                            >
                                {isPaused ? 'Resume Auto-Refresh' : 'Pause Auto-Refresh'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                {overviewData.trafficData && overviewData.trafficData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={overviewData.trafficData}>
                            <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis 
                                dataKey="timestamp" 
                                stroke="#666" 
                                tick={{ fill: '#666' }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                }}
                            />
                            <YAxis 
                                stroke="#666" 
                                tick={{ fill: '#666' }}
                                label={{ value: 'Requests', angle: -90, position: 'insideLeft', fill: '#666' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1a1a1a', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#999' }}
                                labelFormatter={(value) => new Date(value).toLocaleString()}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="requests" 
                                stroke="#f59e0b" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorRequests)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyState message="No traffic data available" icon="inbox" />
                )}
                </CardContent>
            </Card>

            {/* Bottom Section - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Top Endpoints Table */}
                <Card className="lg:col-span-3 bg-[#111111] border-white/10">
                    <CardHeader>
                        <CardTitle>Top Endpoints</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {overviewData.topEndpoints && overviewData.topEndpoints.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left text-sm font-medium text-gray-400 pb-3">Endpoint</th>
                                            <th className="text-right text-sm font-medium text-gray-400 pb-3">Requests</th>
                                            <th className="text-right text-sm font-medium text-gray-400 pb-3">Avg Latency</th>
                                            <th className="text-right text-sm font-medium text-gray-400 pb-3">Error Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overviewData.topEndpoints.map((endpoint, index) => (
                                            <tr 
                                                key={index}
                                                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <td className="py-3 text-sm text-white font-mono">{endpoint.endpoint}</td>
                                                <td className="py-3 text-sm text-gray-300 text-right">{endpoint.requests?.toLocaleString()}</td>
                                                <td className={cn("py-3 text-sm text-right font-medium", getLatencyColor(endpoint.avgLatency))}>
                                                    {endpoint.avgLatency}ms
                                                </td>
                                                <td className={cn("py-3 text-sm text-right font-medium", getErrorRateColor(endpoint.errorRate))}>
                                                    {endpoint.errorRate}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState message="No endpoint data available" icon="search" />
                        )}
                    </CardContent>
                </Card>

                {/* Right Column - Circuit Breaker Status */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Circuit Breaker Status */}
                    <Card className="bg-[#111111] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg">Backend Services</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {overviewData.backends && overviewData.backends.length > 0 ? (
                                <div className="space-y-3">
                                    {overviewData.backends.map((backend, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-white">{backend.name}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 text-xs font-semibold rounded",
                                                        backend.circuitState === 'CLOSED' && 'bg-green-500/20 text-green-400',
                                                        backend.circuitState === 'OPEN' && 'bg-red-500/20 text-red-400',
                                                        backend.circuitState === 'HALF_OPEN' && 'bg-amber-500/20 text-amber-400'
                                                    )}>
                                                        {backend.circuitState || 'CLOSED'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-400">
                                                        Health: {backend.healthScore}%
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs",
                                                        backend.status === 'healthy' && 'text-green-400',
                                                        backend.status === 'degraded' && 'text-amber-400',
                                                        backend.status === 'unhealthy' && 'text-red-400'
                                                    )}>
                                                        {backend.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No backend services" icon="server" />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
