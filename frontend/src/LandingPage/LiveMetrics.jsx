import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Activity, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';
import { GlassCard } from './ui/Card';

/* ── Simulated metrics ── */
const BASE = {
    totalRequests: 24847,
    avgLatency: 8,
    successRate: 99.7,
    reqPerSec: 142,
    spark: [38, 52, 45, 68, 60, 75, 58, 82, 70, 88, 78, 92],
};

/* ── Animated count-up hook ── */
function useCountUp(target, duration = 1400, active = true) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) return;
        const start = Date.now();

        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, [target, duration, active]);

    return value;
}

/* ── Sparkline SVG ── */
function SparkLine({ points }) {
    const safePoints = points.length < 2 ? Array(12).fill(50) : points;

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

    const [sparkPoints, setSparkPoints] = useState(BASE.spark);

    /* Keep sparkline animated with simulated traffic */
    useEffect(() => {
        const id = setInterval(() => {
            setSparkPoints(prev => {
                const last = prev[prev.length - 1];
                const delta = (Math.random() - 0.4) * 18;
                const next = Math.min(96, Math.max(18, last + delta));
                return [...prev.slice(1), Math.round(next)];
            });
        }, 1500);
        return () => clearInterval(id);
    }, []);

    const countRequests = useCountUp(BASE.totalRequests, 1600, isInView);
    const countLatency  = useCountUp(BASE.avgLatency,    1200, isInView);
    const countReqSec   = useCountUp(BASE.reqPerSec,     1000, isInView);

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
                        value={isInView ? `${BASE.successRate}%` : '0%'}
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
                        <span className="text-xs font-mono text-text-muted">simulated</span>
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
