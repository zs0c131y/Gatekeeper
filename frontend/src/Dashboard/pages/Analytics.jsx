import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

// Mock data
const trafficData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    successful: Math.floor(Math.random() * 500) + 200,
    errors: Math.floor(Math.random() * 50) + 10
}));

const heatmapData = Array.from({ length: 7 }, (_, day) => 
    Array.from({ length: 24 }, (_, hour) => ({
        day,
        hour,
        value: Math.floor(Math.random() * 100)
    }))
).flat();

const endpointPerformance = [
    { endpoint: '/api/users', requests: 125430, avgLatency: 45, p95: 89, p99: 156, successRate: 99.8, errors: 25 },
    { endpoint: '/api/products', requests: 98210, avgLatency: 89, p95: 145, p99: 234, successRate: 98.9, errors: 108 },
    { endpoint: '/api/orders', requests: 76540, avgLatency: 156, p95: 298, p99: 456, successRate: 99.5, errors: 38 },
    { endpoint: '/api/auth/login', requests: 54320, avgLatency: 23, p95: 45, p99: 67, successRate: 97.7, errors: 125 },
    { endpoint: '/api/cart', requests: 43210, avgLatency: 67, p95: 123, p99: 189, successRate: 99.2, errors: 35 },
];

const latencyDistribution = [
    { range: '0-10ms', count: 1200 },
    { range: '10-50ms', count: 3400 },
    { range: '50-100ms', count: 2100 },
    { range: '100-200ms', count: 890 },
    { range: '200-500ms', count: 340 },
    { range: '500ms+', count: 120 },
];

const errorsByType = [
    { name: '4xx Client Errors', value: 3245, color: '#f59e0b' },
    { name: '5xx Server Errors', value: 1234, color: '#ef4444' },
];

const errorTimeline = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    '4xx': Math.floor(Math.random() * 50) + 10,
    '5xx': Math.floor(Math.random() * 30) + 5
}));

const clientActivity = [
    { client: '192.168.1.45', requests: 12543, errorRate: 15.2, violations: 23, lastSeen: '2m ago', suspicious: true },
    { client: '10.0.0.123', requests: 9821, errorRate: 0.5, violations: 0, lastSeen: '5m ago', suspicious: false },
    { client: '172.16.0.89', requests: 7654, errorRate: 2.1, violations: 3, lastSeen: '12m ago', suspicious: false },
    { client: '192.168.2.67', requests: 5432, errorRate: 22.3, violations: 45, lastSeen: '3m ago', suspicious: true },
    { client: '10.1.1.56', requests: 4321, errorRate: 1.2, violations: 1, lastSeen: '8m ago', suspicious: false },
];

const timeRanges = ['1 Hour', '24 Hours', '7 Days', '30 Days', 'Custom'];

export function Analytics() {
    const [selectedRange, setSelectedRange] = useState('24 Hours');
    const [sortColumn, setSortColumn] = useState('requests');
    const [sortDirection, setSortDirection] = useState('desc');

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
            <div className="bg-[#111111] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div className="flex gap-2">
                        {timeRanges.map((range) => (
                            <button
                                key={range}
                                onClick={() => setSelectedRange(range)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    selectedRange === range
                                        ? "bg-amber-500 text-black"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Traffic Analytics Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Traffic Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Requests Over Time */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Requests Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trafficData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666' }} />
                                <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1a1a1a', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="successful" stroke="#10b981" strokeWidth={2} name="Successful" />
                                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Traffic Heatmap */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Traffic Heatmap</h3>
                        <div className="grid grid-cols-24 gap-1">
                            {heatmapData.map((cell, i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all"
                                    style={{
                                        backgroundColor: `rgba(245, 158, 11, ${cell.value / 100})`
                                    }}
                                    title={`Day ${cell.day}, Hour ${cell.hour}: ${cell.value} requests`}
                                />
                            ))}
                        </div>
                        <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                            <span>Less</span>
                            <div className="flex gap-1">
                                {[0.2, 0.4, 0.6, 0.8, 1].map((opacity, i) => (
                                    <div
                                        key={i}
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: `rgba(245, 158, 11, ${opacity})` }}
                                    />
                                ))}
                            </div>
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Endpoint Performance Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Endpoint Performance</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Performance Table */}
                    <div className="lg:col-span-2 bg-[#111111] border border-white/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Endpoint Metrics</h3>
                            <input
                                type="text"
                                placeholder="Search endpoints..."
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('endpoint')}>Endpoint</th>
                                        <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('requests')}>Requests</th>
                                        <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('avgLatency')}>Avg</th>
                                        <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('p95')}>p95</th>
                                        <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('p99')}>p99</th>
                                        <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('successRate')}>Success</th>
                                        <th className="text-right text-gray-400 font-medium pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('errors')}>Errors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {endpointPerformance.map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 text-white font-mono">{row.endpoint}</td>
                                            <td className="py-3 text-gray-300 text-right">{row.requests.toLocaleString()}</td>
                                            <td className="py-3 text-green-400 text-right">{row.avgLatency}ms</td>
                                            <td className="py-3 text-amber-400 text-right">{row.p95}ms</td>
                                            <td className="py-3 text-red-400 text-right">{row.p99}ms</td>
                                            <td className="py-3 text-green-400 text-right">{row.successRate}%</td>
                                            <td className="py-3 text-red-400 text-right">{row.errors}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Latency Distribution */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Latency Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={latencyDistribution} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis type="number" stroke="#666" tick={{ fill: '#666' }} />
                                <YAxis type="category" dataKey="range" stroke="#666" tick={{ fill: '#666' }} width={80} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1a1a1a', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">p50:</span>
                                <span className="text-white font-mono">45ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">p95:</span>
                                <span className="text-amber-400 font-mono">156ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">p99:</span>
                                <span className="text-red-400 font-mono">289ms</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Analysis Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Error Analysis</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Errors by Type */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Errors by Type</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={errorsByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {errorsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                            {errorsByType.map((error, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: error.color }}></div>
                                        <span className="text-sm text-gray-300">{error.name}</span>
                                    </div>
                                    <span className="text-sm text-white font-semibold">{error.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Timeline */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Error Timeline</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={errorTimeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666' }} />
                                <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1a1a1a', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="4xx" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="4xx Errors" />
                                <Area type="monotone" dataKey="5xx" stackId="1" stroke="#ef4444" fill="#ef4444" name="5xx Errors" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Client Activity Section */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Client Activity</h2>
                <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Clients</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left text-gray-400 font-medium pb-3">Client IP/ID</th>
                                    <th className="text-right text-gray-400 font-medium pb-3">Requests</th>
                                    <th className="text-right text-gray-400 font-medium pb-3">Error Rate</th>
                                    <th className="text-right text-gray-400 font-medium pb-3">Violations</th>
                                    <th className="text-right text-gray-400 font-medium pb-3">Last Seen</th>
                                    <th className="text-right text-gray-400 font-medium pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientActivity.map((client, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 cursor-pointer">
                                        <td className="py-3 text-white font-mono">{client.client}</td>
                                        <td className="py-3 text-gray-300 text-right">{client.requests.toLocaleString()}</td>
                                        <td className={cn(
                                            "py-3 text-right font-medium",
                                            client.errorRate > 10 ? "text-red-400" : "text-green-400"
                                        )}>
                                            {client.errorRate}%
                                        </td>
                                        <td className={cn(
                                            "py-3 text-right font-medium",
                                            client.violations > 20 ? "text-red-400" : client.violations > 5 ? "text-amber-400" : "text-green-400"
                                        )}>
                                            {client.violations}
                                        </td>
                                        <td className="py-3 text-gray-400 text-right">{client.lastSeen}</td>
                                        <td className="py-3 text-right">
                                            {client.suspicious ? (
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                                                    Suspicious
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                                                    Normal
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
