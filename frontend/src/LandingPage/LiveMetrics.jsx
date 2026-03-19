import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';
import { GlassCard } from './ui/Card';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

function SparkLine({ points }) {
    const pathData = points
        .map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * (100 / (points.length - 1))} ${100 - y}`)
        .join(' ');

    return (
        <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none">
            {[25, 50, 75].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#262626" strokeWidth="0.5" />
            ))}

            <defs>
                <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={`${pathData} L 100 100 L 0 100 Z`}
                fill="url(#sparkGradient)"
            />

            <motion.path
                d={pathData}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
            />
        </svg>
    );
}

export function LiveMetrics() {
    const [connected, setConnected] = useState(false);
    const [totalRequests, setTotalRequests] = useState(null);
    const [avgLatency, setAvgLatency] = useState(null);
    const [successRate, setSuccessRate] = useState(null);
    const [reqPerSec, setReqPerSec] = useState(null);
    const [sparkPoints, setSparkPoints] = useState(Array(12).fill(50));
    const socketRef = useRef(null);
    const totalRef = useRef(0);
    const successCountRef = useRef(0);
    const errorCountRef = useRef(0);

    // Fetch initial data from /api/status
    useEffect(() => {
        async function fetchInitial() {
            try {
                const res = await fetch(`${API_BASE}/api/status`);
                if (res.ok) {
                    const data = await res.json();
                    setTotalRequests(data.requestCount || 0);
                    totalRef.current = data.requestCount || 0;
                    if (data.avgLatency) setAvgLatency(data.avgLatency);
                }
            } catch {
                // Will fall back to WebSocket data
            }
        }
        fetchInitial();
    }, []);

    // Connect to WebSocket for live updates
    useEffect(() => {
        const socket = io(`${API_BASE}/dashboard`, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.on('traffic:update', (data) => {
            // Accumulate total requests
            if (data.requestCount > 0) {
                totalRef.current += data.requestCount;
                setTotalRequests(totalRef.current);
            }

            // Track success/error for rate calculation
            successCountRef.current += (data.requestCount - (data.errorCount || 0));
            errorCountRef.current += (data.errorCount || 0);
            const totalSeen = successCountRef.current + errorCountRef.current;
            if (totalSeen > 0) {
                setSuccessRate(
                    ((successCountRef.current / totalSeen) * 100).toFixed(2),
                );
            }

            // Update avg latency
            if (data.avgLatency > 0) {
                setAvgLatency(data.avgLatency);
            }

            // Update req/sec
            setReqPerSec(data.reqPerSec || 0);

            // Update sparkline points (normalize reqPerSec to 0-100 range)
            setSparkPoints((prev) => {
                const val = Math.min(100, Math.max(5, (data.reqPerSec || 0) * 5 + 30));
                return [...prev.slice(1), val];
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // Display values with fallbacks
    const displayRequests = totalRequests != null ? totalRequests : 0;
    const displayLatency = avgLatency != null ? `${avgLatency}ms` : '\u2014';
    const displaySuccessRate = successRate != null ? `${successRate}%` : '\u2014';
    const displayReqPerSec = reqPerSec != null ? reqPerSec : 0;

    return (
        <Section id="metrics">
            <SectionHeader
                title="Live Dashboard Preview"
                subtitle="Real-time visibility into your API traffic"
            />

            <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <Activity className="w-6 h-6 text-primary mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">
                            {displayRequests.toLocaleString()}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">Total Requests</div>
                    </GlassCard>

                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <Clock className="w-6 h-6 text-primary mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">
                            {displayLatency}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">Avg Latency</div>
                    </GlassCard>

                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <CheckCircle className="w-6 h-6 text-success mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">
                            {displaySuccessRate}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">Success Rate</div>
                    </GlassCard>

                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <TrendingUp className="w-6 h-6 text-primary mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">
                            {displayReqPerSec}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">Req/sec</div>
                    </GlassCard>
                </div>

                {/* Sparkline Chart */}
                <div className="bg-background rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-text-primary">Traffic Over Time</span>
                        <div className="flex items-center gap-2">
                            {connected ? (
                                <Wifi className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                                <WifiOff className="w-3.5 h-3.5 text-gray-500" />
                            )}
                            <span className={`text-xs font-mono ${connected ? 'text-green-400' : 'text-gray-500'}`}>
                                {connected ? 'Live' : 'Connecting...'}
                            </span>
                        </div>
                    </div>
                    <SparkLine points={sparkPoints} />
                </div>
            </div>
        </Section>
    );
}
