import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';
import { GlassCard } from './ui/Card';

function useAnimatedCounter(end, duration = 2000, start = 0) {
    const [count, setCount] = useState(start);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!isVisible) return;

        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            setCount(Math.floor(progress * (end - start) + start));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, start, isVisible]);

    return { count, setIsVisible };
}

function MetricCard({ icon: Icon, label, value, suffix = '', prefix = '' }) {
    const { count, setIsVisible } = useAnimatedCounter(value);

    return (
        <motion.div
            onViewportEnter={() => setIsVisible(true)}
            viewport={{ once: true }}
        >
            <GlassCard className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold font-mono text-text-primary mb-1">
                    {prefix}{count.toLocaleString()}{suffix}
                </div>
                <div className="text-sm text-text-secondary">{label}</div>
            </GlassCard>
        </motion.div>
    );
}

function SparkLine() {
    const [points, setPoints] = useState([30, 45, 35, 60, 50, 75, 65, 80, 70, 90, 85, 95]);

    useEffect(() => {
        const interval = setInterval(() => {
            setPoints(prev => {
                const newPoints = [...prev.slice(1), Math.random() * 40 + 60];
                return newPoints;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const pathData = points
        .map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * (100 / (points.length - 1))} ${100 - y}`)
        .join(' ');

    return (
        <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none">
            {/* Grid lines */}
            {[25, 50, 75].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#262626" strokeWidth="0.5" />
            ))}

            {/* Gradient fill */}
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

            {/* Line */}
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
    const [requestCount, setRequestCount] = useState(847523);

    useEffect(() => {
        const interval = setInterval(() => {
            setRequestCount(prev => prev + Math.floor(Math.random() * 10 + 1));
        }, 100);
        return () => clearInterval(interval);
    }, []);

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
                            {requestCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">Total Requests</div>
                    </GlassCard>

                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <Clock className="w-6 h-6 text-primary mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">2.3ms</div>
                        <div className="text-xs text-text-secondary mt-1">Avg Latency</div>
                    </GlassCard>

                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <CheckCircle className="w-6 h-6 text-success mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">99.97%</div>
                        <div className="text-xs text-text-secondary mt-1">Success Rate</div>
                    </GlassCard>

                    <GlassCard className="text-center flex flex-col items-center justify-center py-6">
                        <TrendingUp className="w-6 h-6 text-primary mb-3" />
                        <div className="text-2xl md:text-3xl font-bold font-mono text-text-primary">1.2M</div>
                        <div className="text-xs text-text-secondary mt-1">Req/min</div>
                    </GlassCard>
                </div>

                {/* Sparkline Chart */}
                <div className="bg-background rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-text-primary">Traffic Over Time</span>
                        <span className="text-xs text-text-secondary font-mono">Live</span>
                    </div>
                    <SparkLine />
                </div>
            </div>
        </Section>
    );
}
