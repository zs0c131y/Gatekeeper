import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '../../hooks/useApi';
import { api } from '../../utils/api';
import { ChartLoading, TableLoading } from '../../components/common/LoadingSkeleton';
import { ErrorMessage, InlineError } from '../../components/common/ErrorMessage';
import { EmptyState, InlineEmpty } from '../../components/common/EmptyState';

const timeRanges = [
    { label: '1 Hour', value: '1h' },
    { label: '24 Hours', value: '24h' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
];

export function Analytics() {
    const [selectedRange, setSelectedRange] = useState('24h');
    const [sortColumn, setSortColumn] = useState('requests');
    const [sortDirection, setSortDirection] = useState('desc');

    // Fetch data from API
    const { data: trafficData, loading: trafficLoading, error: trafficError } = useApi(
        () => api.getTraffic({ range: selectedRange }),
        [selectedRange]
    );
    const { data: endpointsData, loading: endpointsLoading, error: endpointsError } = useApi(
        () => api.getEndpoints()
    );
    const { data: errorsData, loading: errorsLoading, error: errorsError } = useApi(
        () => api.getErrors({ range: selectedRange }),
        [selectedRange]
    );

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <Card className="bg-[#111111] border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div className="flex gap-2">
                            {timeRanges.map((range) => (
                                <Button
                                    key={range.value}
                                    onClick={() => setSelectedRange(range.value)}
                                    variant={selectedRange === range.value ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        selectedRange === range.value
                                            ? "bg-amber-500 text-black hover:bg-amber-600"
                                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/10"
                                    )}
                                >
                                    {range.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white/5 hover:bg-white/10 border-white/10 text-white">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </CardContent>
            </Card>

            {/* Traffic Analytics Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Traffic Analytics</h2>
                {trafficLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartLoading />
                        <ChartLoading />
                    </div>
                ) : trafficError ? (
                    <InlineError error={trafficError} />
                ) : trafficData?.trafficData && trafficData.trafficData.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Requests Over Time */}
                        <Card className="bg-[#111111] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Requests Over Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trafficData.trafficData}>
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
                                    <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1a1a1a', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                        labelFormatter={(value) => new Date(value).toLocaleString()}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} name="Requests" />
                                    <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
                                </LineChart>
                            </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Traffic Summary */}
                        <Card className="bg-[#111111] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Traffic Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-lg">
                                        <div className="text-sm text-gray-400 mb-1">Total Requests</div>
                                        <div className="text-2xl font-bold text-white">
                                            {trafficData.trafficData.reduce((sum, d) => sum + (d.requests || 0), 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-lg">
                                        <div className="text-sm text-gray-400 mb-1">Total Errors</div>
                                        <div className="text-2xl font-bold text-red-400">
                                            {trafficData.trafficData.reduce((sum, d) => sum + (d.errors || 0), 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-lg">
                                        <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {(() => {
                                                const totalReqs = trafficData.trafficData.reduce((sum, d) => sum + (d.requests || 0), 0);
                                                const totalErrs = trafficData.trafficData.reduce((sum, d) => sum + (d.errors || 0), 0);
                                                return totalReqs > 0 ? ((1 - totalErrs / totalReqs) * 100).toFixed(2) + '%' : 'N/A';
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <InlineEmpty message="No traffic data available" icon="inbox" />
                )}
            </div>

            {/* Endpoint Performance Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Endpoint Performance</h2>
                {endpointsLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <TableLoading rows={5} />
                        <ChartLoading />
                    </div>
                ) : endpointsError ? (
                    <InlineError error={endpointsError} />
                ) : endpointsData?.endpoints && endpointsData.endpoints.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {/* Performance Table */}
                        <Card className="bg-[#111111] border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-lg">Endpoint Metrics</CardTitle>
                                <input
                                    type="text"
                                    placeholder="Search endpoints..."
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                            </CardHeader>
                            <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('endpoint')}>Endpoint</th>
                                            <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('totalRequests')}>Requests</th>
                                            <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('avgLatency')}>Avg</th>
                                            <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('p95Latency')}>p95</th>
                                            <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('p99Latency')}>p99</th>
                                            <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('successRate')}>Success</th>
                                            <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('errorCount')}>Errors</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {endpointsData.endpoints.map((row, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-3 text-white font-mono">{row.endpoint}</td>
                                                <td className="py-3 text-gray-300 text-right">{row.totalRequests?.toLocaleString()}</td>
                                                <td className="py-3 text-green-400 text-right">{row.avgLatency}ms</td>
                                                <td className="py-3 text-amber-400 text-right">{row.p95Latency}ms</td>
                                                <td className="py-3 text-red-400 text-right">{row.p99Latency}ms</td>
                                                <td className="py-3 text-green-400 text-right">{row.successRate}%</td>
                                                <td className="py-3 text-red-400 text-right">{row.errorCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <InlineEmpty message="No endpoint data available" icon="search" />
                )}
            </div>

            {/* Error Analysis Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Error Analysis</h2>
                {errorsLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartLoading />
                        <ChartLoading />
                    </div>
                ) : errorsError ? (
                    <InlineError error={errorsError} />
                ) : errorsData?.errorBreakdown && errorsData.errorBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Errors by Type */}
                        <Card className="bg-[#111111] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Errors by Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={errorsData.errorBreakdown.map((err, idx) => ({
                                            ...err,
                                            color: idx === 0 ? '#f59e0b' : '#ef4444'
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="type"
                                    >
                                        {errorsData.errorBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#ef4444'} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1a1a1a', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-4">
                                {errorsData.errorBreakdown.map((error, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i === 0 ? '#f59e0b' : '#ef4444' }}></div>
                                            <span className="text-sm text-gray-300">{error.type}</span>
                                        </div>
                                        <span className="text-sm text-white font-semibold">{error.count?.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            </CardContent>
                        </Card>

                        {/* Error Timeline */}
                        <Card className="bg-[#111111] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Error Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                            {errorsData.errorTimeline && errorsData.errorTimeline.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={errorsData.errorTimeline}>
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
                                        <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#1a1a1a', 
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px'
                                            }}
                                            labelFormatter={(value) => new Date(value).toLocaleString()}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#ef4444" name="Errors" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <InlineEmpty message="No error timeline data" icon="inbox" />
                            )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <InlineEmpty message="No error data available" icon="inbox" />
                )}
            </div>
        </div>
    );
}
