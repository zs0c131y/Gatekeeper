import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, Server } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

// Mock data generators
const generateSparklineData = () => {
    return Array.from({ length: 12 }, (_, i) => ({
        value: Math.floor(Math.random() * 100) + 50
    }));
};

const generateLiveTrafficData = () => {
    return Array.from({ length: 60 }, (_, i) => ({
        time: i,
        requests: Math.floor(Math.random() * 50) + 20
    }));
};

const topEndpoints = [
    { endpoint: '/api/users', requests: 12543, latency: 45, errorRate: 0.2 },
    { endpoint: '/api/products', requests: 9821, latency: 89, errorRate: 1.1 },
    { endpoint: '/api/orders', requests: 7654, latency: 156, errorRate: 0.5 },
    { endpoint: '/api/auth/login', requests: 5432, latency: 23, errorRate: 2.3 },
    { endpoint: '/api/cart', requests: 4321, latency: 67, errorRate: 0.8 },
    { endpoint: '/api/search', requests: 3210, latency: 234, errorRate: 1.9 },
    { endpoint: '/api/checkout', requests: 2109, latency: 189, errorRate: 3.2 },
    { endpoint: '/api/reviews', requests: 1876, latency: 98, errorRate: 0.4 },
    { endpoint: '/api/wishlist', requests: 1543, latency: 54, errorRate: 0.6 },
    { endpoint: '/api/notifications', requests: 1234, latency: 32, errorRate: 0.1 },
];

const circuitBreakers = [
    { name: 'users-service', state: 'CLOSED', health: 98, lastChange: '2 hours ago' },
    { name: 'products-service', state: 'CLOSED', health: 95, lastChange: '5 hours ago' },
    { name: 'orders-service', state: 'HALF_OPEN', health: 72, lastChange: '15 minutes ago' },
    { name: 'payments-service', state: 'CLOSED', health: 99, lastChange: '1 day ago' },
    { name: 'inventory-service', state: 'OPEN', health: 45, lastChange: '3 minutes ago' },
];

const recentAlerts = [
    { time: '2m ago', type: 'error', message: 'High error rate on /api/checkout' },
    { time: '5m ago', type: 'warning', message: 'Circuit breaker opened for inventory-service' },
    { time: '12m ago', type: 'info', message: 'Rate limit reached for client 192.168.1.45' },
    { time: '25m ago', type: 'error', message: 'Backend timeout on orders-service' },
    { time: '1h ago', type: 'warning', message: 'High latency detected on /api/search' },
];

function MetricCard({ title, value, change, trend, sparklineData, icon: Icon, color }) {
    const isPositive = change > 0;
    
    return (
        <div className="bg-[#111111] border border-white/10 rounded-xl p-6 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
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
            
            <div className="flex items-end justify-between">
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
                        {Math.abs(change)}%
                    </span>
                    <span className="text-gray-500 text-xs">{trend}</span>
                </div>
                
                <div className="w-20 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#f59e0b" 
                                strokeWidth={2} 
                                dot={false} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export function Overview() {
    const [liveData, setLiveData] = useState(generateLiveTrafficData());
    const [isPaused, setIsPaused] = useState(false);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        if (isPaused) return;
        
        const interval = setInterval(() => {
            setLiveData(prev => {
                const newData = [...prev.slice(1), {
                    time: prev[prev.length - 1].time + 1,
                    requests: Math.floor(Math.random() * 50) + 20
                }];
                return newData;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused]);

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
                    value="1.2M"
                    change={12.5}
                    trend="vs last hour"
                    sparklineData={generateSparklineData()}
                    icon={Activity}
                />
                <MetricCard
                    title="Avg Latency"
                    value="67ms"
                    change={-8.3}
                    trend="vs last hour"
                    sparklineData={generateSparklineData()}
                    icon={Clock}
                    color="green"
                />
                <MetricCard
                    title="Error Rate"
                    value="1.2%"
                    change={15.2}
                    trend="vs last hour"
                    sparklineData={generateSparklineData()}
                    icon={AlertTriangle}
                    color="amber"
                />
                <MetricCard
                    title="Active Backends"
                    value="4/5"
                    change={-20}
                    trend="1 degraded"
                    sparklineData={generateSparklineData()}
                    icon={Server}
                    color="red"
                />
            </div>

            {/* Live Traffic Chart */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Live Traffic</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                            )}></div>
                            <span className="text-sm text-gray-400">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                        >
                            {isPaused ? 'Resume' : 'Pause'}
                        </button>
                    </div>
                </div>
                
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={liveData}>
                        <defs>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis 
                            dataKey="time" 
                            stroke="#666" 
                            tick={{ fill: '#666' }}
                            label={{ value: 'Seconds', position: 'insideBottom', offset: -5, fill: '#666' }}
                        />
                        <YAxis 
                            stroke="#666" 
                            tick={{ fill: '#666' }}
                            label={{ value: 'Requests/sec', angle: -90, position: 'insideLeft', fill: '#666' }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#1a1a1a', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                            labelStyle={{ color: '#999' }}
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
            </div>

            {/* Bottom Section - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Top Endpoints Table */}
                <div className="lg:col-span-3 bg-[#111111] border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Top Endpoints</h2>
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
                                {topEndpoints.map((endpoint, index) => (
                                    <tr 
                                        key={index}
                                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <td className="py-3 text-sm text-white font-mono">{endpoint.endpoint}</td>
                                        <td className="py-3 text-sm text-gray-300 text-right">{endpoint.requests.toLocaleString()}</td>
                                        <td className={cn("py-3 text-sm text-right font-medium", getLatencyColor(endpoint.latency))}>
                                            {endpoint.latency}ms
                                        </td>
                                        <td className={cn("py-3 text-sm text-right font-medium", getErrorRateColor(endpoint.errorRate))}>
                                            {endpoint.errorRate}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column - Circuit Breaker Status & Recent Alerts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Circuit Breaker Status */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Circuit Breaker Status</h2>
                        <div className="space-y-3">
                            {circuitBreakers.map((cb, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-white">{cb.name}</span>
                                            <span className={cn(
                                                "px-2 py-0.5 text-xs font-semibold rounded",
                                                cb.state === 'CLOSED' && 'bg-green-500/20 text-green-400',
                                                cb.state === 'OPEN' && 'bg-red-500/20 text-red-400',
                                                cb.state === 'HALF_OPEN' && 'bg-amber-500/20 text-amber-400'
                                            )}>
                                                {cb.state}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">Health: {cb.health}%</span>
                                            <span className="text-xs text-gray-500">{cb.lastChange}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Alerts */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Recent Alerts</h2>
                        <div className="space-y-3">
                            {recentAlerts.map((alert, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                        alert.type === 'error' && 'bg-red-400',
                                        alert.type === 'warning' && 'bg-amber-400',
                                        alert.type === 'info' && 'bg-blue-400'
                                    )}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white">{alert.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
                            View All Alerts →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
