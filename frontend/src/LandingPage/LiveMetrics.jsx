import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Activity, Clock, CheckCircle, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';
import { GlassCard } from './ui/Card';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

/* ── Animated count-up hook ── */
function useCountUp(target, duration = 1400, active = true) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) return;
        const start = Date.now();
        const from = 0;

        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(from + (target - from) * eased));
            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, [target, duration, active]);

    return value;
}

/* ── Sparkline SVG ── */
function SparkLine({ points }) {
    const safePoints = points.length < 2 ? Array(12).fill(0) : points;

    const pathData = safePoints
        .map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * (100 / (safePoints.length - 1))} ${100 - y}`)
        .join(' ');

    const areaPath = `${pathData} L 100 100 L 0 100 Z`;

    return (
        <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="liveSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
            </defs>

            {[25, 50, 75].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#262626" strokeWidth="0.5" />
            ))}

            <path d={areaPath} fill="url(#liveSparkGrad)" />

            <motion.path
                key={pathData}
                d={pathData}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {safePoints.length > 1 && (() => {
                const lastY = 100 - safePoints[safePoints.length - 1];
                return (
                    <motion.circle
                        cx={100}
                        cy={lastY}
                        r="2.5"
                        fill="#f59e0b"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 }}
                    />
                );
            })()}
        </svg>
    );
}

/* ── Metric card ── */
function MetricCard({ icon: Icon, iconColor, label, value, unit, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.4 }}
        >
            <GlassCard className="text-center flex flex-col items-center justify-center py-6 gap-1">
                <Icon className={`w-5 h-5 mb-2 ${iconColor}`} />
                <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary leading-none">
                    {value}
                    {unit && <span className="text-base font-normal text-text-secondary ml-0.5">{unit}</span>}
                </div>
                <div className="text-xs text-text-secondary mt-1">{label}</div>
            </GlassCard>
        </motion.div>
    );
}

/* ── Main Component ── */
export function LiveMetrics() {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

    const [connected, setConnected] = useState(false);
    const [metrics, setMetrics] = useState({ totalRequests: 0, avgLatency: 0, successRate: null, reqPerSec: 0 });
    const [sparkPoints, setSparkPoints] = useState(Array(12).fill(0));

    useEffect(() => {
        const socket = io(`${API_BASE}/dashboard`, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        const totalRef = { current: 0 };
        const successRef = { current: 0 };
        const errorRef = { current: 0 };

        socket.on('traffic:update', (data) => {
            if (data.requestCount > 0) totalRef.current += data.requestCount;
            successRef.current += data.requestCount - (data.errorCount || 0);
            errorRef.current += data.errorCount || 0;

            const total = successRef.current + errorRef.current;
            setMetrics({
                totalRequests: totalRef.current,
                avgLatency: data.avgLatency || 0,
                successRate: total > 0 ? ((successRef.current / total) * 100).toFixed(1) : null,
                reqPerSec: data.reqPerSec || 0,
            });

            setSparkPoints(prev => {
                const val = Math.min(96, Math.max(0, (data.reqPerSec || 0) * 5));
                return [...prev.slice(1), val];
            });
        });

        return () => socket.disconnect();
    }, []);

    const countRequests = useCountUp(metrics.totalRequests, 1600, isInView);
    const countLatency  = useCountUp(metrics.avgLatency,    1200, isInView);
    const countReqSec   = useCountUp(metrics.reqPerSec,     1000, isInView);

    return (
        <div ref={sectionRef}>
        <Section id="metrics">
            <SectionHeader
                title="Live Dashboard Preview"
                subtitle="Real-time visibility into your API traffic"
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5 }}
                className="bg-surface border border-border rounded-2xl p-6 md:p-8"
            >
                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                        icon={Activity}
                        iconColor="text-primary"
                        label="Total Requests"
                        value={countRequests.toLocaleString()}
                        delay={0}
                    />
                    <MetricCard
                        icon={Clock}
                        iconColor="text-primary"
                        label="Avg Latency"
                        value={countLatency}
                        unit="ms"
                        delay={0.08}
                    />
                    <MetricCard
                        icon={CheckCircle}
                        iconColor="text-green-400"
                        label="Success Rate"
                        value={metrics.successRate != null ? `${metrics.successRate}%` : '—%'}
                        delay={0.16}
                    />
                    <MetricCard
                        icon={TrendingUp}
                        iconColor="text-primary"
                        label="Req/sec"
                        value={countReqSec}
                        delay={0.24}
                    />
                </div>

                {/* ── Sparkline ── */}
                <div className="bg-background rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-text-primary">Traffic Over Time</span>
                        <div className="flex items-center gap-1.5">
                            {connected
                                ? <Wifi className="w-3.5 h-3.5 text-green-400" />
                                : <WifiOff className="w-3.5 h-3.5 text-gray-600" />
                            }
                            <span className={`text-xs font-mono ${connected ? 'text-green-400' : 'text-gray-500'}`}>
                                {connected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <SparkLine points={sparkPoints} />

                    <div className="flex justify-between mt-1 text-[10px] text-text-muted">
                        <span>−90s</span>
                        <span>−45s</span>
                        <span>now</span>
                    </div>
                </div>
            </motion.div>
        </Section>
        </div>
    );
}
