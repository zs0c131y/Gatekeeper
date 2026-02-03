import { useState } from 'react';
import { Save, Plus, Edit2, Trash2, Key, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

const tabs = [
    { id: 'general', label: 'General' },
    { id: 'ratelimiting', label: 'Rate Limiting' },
    { id: 'circuitbreakers', label: 'Circuit Breakers' },
    { id: 'backends', label: 'Backends' },
    { id: 'security', label: 'Security' },
    { id: 'alerts', label: 'Alerts' },
];

const backends = [
    { name: 'users-service', url: 'http://localhost:3001', health: '/health', status: 'healthy', weight: 1 },
    { name: 'products-service', url: 'http://localhost:3002', health: '/health', status: 'healthy', weight: 1 },
    { name: 'orders-service', url: 'http://localhost:3003', health: '/health', status: 'degraded', weight: 1 },
    { name: 'payments-service', url: 'http://localhost:3004', health: '/health', status: 'healthy', weight: 2 },
];

const apiKeys = [
    { key: 'gk_live_abc123...', created: '2024-01-15', lastUsed: '2 hours ago' },
    { key: 'gk_live_def456...', created: '2024-01-10', lastUsed: '5 minutes ago' },
    { key: 'gk_test_xyz789...', created: '2024-01-05', lastUsed: 'Never' },
];

export function Settings() {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-2">
                <div className="flex gap-2 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                                activeTab === tab.id
                                    ? "bg-amber-500 text-black"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'ratelimiting' && <RateLimitingTab />}
                {activeTab === 'circuitbreakers' && <CircuitBreakersTab />}
                {activeTab === 'backends' && <BackendsTab backends={backends} />}
                {activeTab === 'security' && <SecurityTab apiKeys={apiKeys} />}
                {activeTab === 'alerts' && <AlertsTab />}
            </div>
        </div>
    );
}

function GeneralTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">General Settings</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Gateway Name</label>
                    <input
                        type="text"
                        defaultValue="Gatekeeper API Gateway"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Logging Level</label>
                    <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                        <option>ERROR</option>
                        <option>WARN</option>
                        <option selected>INFO</option>
                        <option>DEBUG</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Log Retention Period (days)</label>
                    <input
                        type="number"
                        defaultValue="30"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/50" />
                        <span className="text-white">Enable Adaptive Rate Limiting</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/50" />
                        <span className="text-white">Enable Circuit Breaking</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/50" />
                        <span className="text-white">Enable Real-time Analytics</span>
                    </label>
                </div>
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
    );
}

function RateLimitingTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Rate Limiting</h2>

            {/* Global Rate Limits */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Global Rate Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Requests per Minute</label>
                        <input
                            type="number"
                            defaultValue="1000"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Burst Allowance</label>
                        <input
                            type="number"
                            defaultValue="100"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                    </div>
                </div>
            </div>

            {/* Per-Endpoint Configuration */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Per-Endpoint Configuration</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Endpoint
                    </button>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left text-gray-400 font-medium pb-3">Endpoint</th>
                            <th className="text-right text-gray-400 font-medium pb-3">Rate Limit</th>
                            <th className="text-center text-gray-400 font-medium pb-3">Adaptive</th>
                            <th className="text-right text-gray-400 font-medium pb-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-white/5">
                            <td className="py-3 text-white font-mono">/api/auth/login</td>
                            <td className="py-3 text-gray-300 text-right">10/min</td>
                            <td className="py-3 text-center">
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">Enabled</span>
                            </td>
                            <td className="py-3 text-right">
                                <button className="p-1.5 hover:bg-white/10 rounded"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                                <button className="p-1.5 hover:bg-white/10 rounded ml-1"><Trash2 className="w-4 h-4 text-red-400" /></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Adaptive Settings */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Adaptive Settings</h3>
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span className="text-white">Enable Adaptive Rate Limiting</span>
                    </label>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Sensitivity</label>
                        <div className="flex gap-2">
                            {['Low', 'Medium', 'High'].map((level) => (
                                <button
                                    key={level}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm transition-colors",
                                        level === 'Medium' ? "bg-amber-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Min Limit</label>
                            <input type="number" defaultValue="100" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Max Limit</label>
                            <input type="number" defaultValue="10000" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
    );
}

function CircuitBreakersTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Circuit Breakers</h2>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Global Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Failure Threshold (%)</label>
                        <input type="number" defaultValue="50" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Request Count</label>
                        <input type="number" defaultValue="10" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (seconds)</label>
                        <input type="number" defaultValue="60" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Half-Open Test Requests</label>
                        <input type="number" defaultValue="3" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Per-Backend Configuration</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left text-gray-400 font-medium pb-3">Backend</th>
                            <th className="text-right text-gray-400 font-medium pb-3">Threshold</th>
                            <th className="text-right text-gray-400 font-medium pb-3">Timeout</th>
                            <th className="text-center text-gray-400 font-medium pb-3">State</th>
                            <th className="text-right text-gray-400 font-medium pb-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backends.map((backend, i) => (
                            <tr key={i} className="border-b border-white/5">
                                <td className="py-3 text-white">{backend.name}</td>
                                <td className="py-3 text-gray-300 text-right">50%</td>
                                <td className="py-3 text-gray-300 text-right">60s</td>
                                <td className="py-3 text-center">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">CLOSED</span>
                                </td>
                                <td className="py-3 text-right space-x-1">
                                    <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs">Manual Open</button>
                                    <button className="p-1.5 hover:bg-white/10 rounded"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
    );
}

function BackendsTab({ backends }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Backend Services</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add New Backend
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {backends.map((backend, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{backend.name}</h3>
                                <p className="text-sm text-gray-400 font-mono">{backend.url}</p>
                            </div>
                            <span className={cn(
                                "px-2 py-1 text-xs font-semibold rounded",
                                backend.status === 'healthy' ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                            )}>
                                {backend.status}
                            </span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Health Check:</span>
                                <span className="text-white font-mono">{backend.health}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Load Balance Weight:</span>
                                <span className="text-white">{backend.weight}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors">
                                <Edit2 className="w-4 h-4 inline mr-1" />
                                Edit
                            </button>
                            <button className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm transition-colors">
                                <Trash2 className="w-4 h-4 inline mr-1" />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SecurityTab({ apiKeys }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Security</h2>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">JWT Secret Rotation</h3>
                <p className="text-gray-400 text-sm mb-4">Rotating the JWT secret will invalidate all existing tokens. Users will need to re-authenticate.</p>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Rotate JWT Secret
                </button>
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">API Keys</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                        Generate New Key
                    </button>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left text-gray-400 font-medium pb-3">API Key</th>
                            <th className="text-left text-gray-400 font-medium pb-3">Created</th>
                            <th className="text-left text-gray-400 font-medium pb-3">Last Used</th>
                            <th className="text-right text-gray-400 font-medium pb-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apiKeys.map((key, i) => (
                            <tr key={i} className="border-b border-white/5">
                                <td className="py-3 text-white font-mono flex items-center gap-2">
                                    {key.key}
                                    <button><Copy className="w-3 h-3 text-gray-400" /></button>
                                </td>
                                <td className="py-3 text-gray-300">{key.created}</td>
                                <td className="py-3 text-gray-300">{key.lastUsed}</td>
                                <td className="py-3 text-right">
                                    <button className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs">Revoke</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">CORS Configuration</h3>
                <label className="block text-sm font-medium text-gray-300 mb-2">Allowed Origins (one per line)</label>
                <textarea
                    rows={4}
                    defaultValue="https://example.com&#10;https://app.example.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
    );
}

function AlertsTab() {
    const alertRules = [
        { name: 'Circuit Breaker State Changes', enabled: true, threshold: null },
        { name: 'High Error Rate', enabled: true, threshold: 5 },
        { name: 'High Latency', enabled: true, threshold: 1000 },
        { name: 'Rate Limit Violations', enabled: false, threshold: 100 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Alert Rules</h2>

            <div className="space-y-3">
                {alertRules.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                            <input
                                type="checkbox"
                                defaultChecked={rule.enabled}
                                className="w-4 h-4"
                            />
                            <span className="text-white">{rule.name}</span>
                        </div>
                        {rule.threshold !== null && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">Threshold:</span>
                                <input
                                    type="number"
                                    defaultValue={rule.threshold}
                                    className="w-24 px-3 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                                />
                                <span className="text-gray-400 text-sm">
                                    {rule.name.includes('Error') ? '%' : rule.name.includes('Latency') ? 'ms' : 'count'}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Notification Delivery</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            placeholder="alerts@example.com"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                        <input
                            type="url"
                            placeholder="https://hooks.slack.com/..."
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                    </div>
                </div>
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
    );
}
