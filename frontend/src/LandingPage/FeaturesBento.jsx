import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Activity, Shield, GitBranch, Heart, FileCode, TrendingUp } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';

/* ─────────────────────────── Card Visuals ─────────────────────────── */

/** Bar chart — Adaptive Rate Limiting */
function RateLimitVisual() {
    return (
        <div className="mt-6 p-4 bg-background rounded-xl border border-border">
            <div className="flex items-end gap-1 h-20">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5 }}
                        viewport={{ once: true }}
                        className="flex-1 bg-gradient-to-t from-primary/30 to-primary rounded-t"
                    />
                ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
            </div>
        </div>
    );
}

/** Animated state pill cycle — Smart Circuit Breaking */
function CircuitBreakerVisual() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setActive(s => (s + 1) % 3), 1800);
        return () => clearInterval(id);
    }, []);

    const states = [
        { label: 'CLOSED',    dot: 'bg-green-400',  ring: 'border-green-500/40',  bg: 'bg-green-500/10',  text: 'text-green-400' },
        { label: 'OPEN',      dot: 'bg-red-400',    ring: 'border-red-500/40',    bg: 'bg-red-500/10',    text: 'text-red-400' },
        { label: 'HALF_OPEN', dot: 'bg-amber-400',  ring: 'border-amber-500/40',  bg: 'bg-amber-500/10',  text: 'text-amber-400' },
    ];

    return (
        <div className="mt-6 p-4 bg-background rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2">
                {states.map((s, i) => (
                    <motion.div
                        key={i}
                        animate={i === active
                            ? { opacity: 1, scale: 1.04 }
                            : { opacity: 0.35, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border transition-colors duration-500 ${
                            i === active ? `${s.bg} ${s.ring}` : 'border-transparent'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${s.dot} ${i === active ? 'animate-pulse' : ''}`} />
                        <span className={`text-[10px] font-mono font-bold leading-tight text-center ${i === active ? s.text : 'text-gray-600'}`}>
                            {s.label}
                        </span>
                    </motion.div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-text-muted">auto-recovery</span>
                <div className="h-px flex-1 bg-border" />
            </div>
        </div>
    );
}

/** Trace waterfall spans — Real-time Tracing */
function TraceVisual() {
    const spans = [
        { label: 'gateway',   offset: 0,  width: 100, color: 'bg-primary',    ms: '120ms' },
        { label: 'auth-svc',  offset: 4,  width: 28,  color: 'bg-blue-400',   ms: '34ms'  },
        { label: 'users-svc', offset: 14, width: 48,  color: 'bg-green-400',  ms: '58ms'  },
        { label: 'db',        offset: 30, width: 24,  color: 'bg-purple-400', ms: '29ms'  },
    ];

    return (
        <div className="mt-6 p-4 bg-background rounded-xl border border-border space-y-2.5">
            {spans.map((span, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted w-16 text-right shrink-0">
                        {span.label}
                    </span>
                    <div className="flex-1 relative h-3.5 bg-border/30 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${span.width}%` }}
                            transition={{ delay: i * 0.12 + 0.1, duration: 0.5, ease: 'easeOut' }}
                            viewport={{ once: true }}
                            style={{ marginLeft: `${span.offset}%` }}
                            className={`absolute h-full rounded-full ${span.color} opacity-75`}
                        />
                    </div>
                    <span className="text-[10px] font-mono text-text-muted w-10 shrink-0 text-right">
                        {span.ms}
                    </span>
                </div>
            ))}
        </div>
    );
}

/** Health scores with traffic bars — Health-Aware Routing */
function HealthRoutingVisual() {
    const backends = [
        { name: 'svc-a', score: 98, traffic: 72, scoreColor: 'text-green-400', barColor: 'bg-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
        { name: 'svc-b', score: 61, traffic: 23, scoreColor: 'text-amber-400', barColor: 'bg-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
        { name: 'svc-c', score: 14, traffic: 5,  scoreColor: 'text-red-400',   barColor: 'bg-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/30'   },
    ];

    return (
        <div className="mt-6 p-4 bg-background rounded-xl border border-border space-y-2">
            {backends.map((b, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${b.bg} ${b.border}`}>
                    <span className="text-[10px] font-mono text-text-muted w-10 shrink-0">{b.name}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${b.traffic}%` }}
                            transition={{ delay: i * 0.12, duration: 0.6, ease: 'easeOut' }}
                            viewport={{ once: true }}
                            className={`h-full rounded-full ${b.barColor}`}
                        />
                    </div>
                    <span className={`text-[10px] font-bold font-mono ${b.scoreColor} w-6 text-right shrink-0`}>
                        {b.score}
                    </span>
                </div>
            ))}
            <p className="text-[10px] text-text-muted text-center pt-1">
                health score → traffic weight
            </p>
        </div>
    );
}

/** Structured log lines — Structured Logging */
function LoggingVisual() {
    const logs = [
        { level: 'INFO',  color: 'text-green-400', msg: 'GET /api/users → 200',        meta: '12ms'  },
        { level: 'WARN',  color: 'text-amber-400', msg: 'Rate limit 80% · 10.0.0.4',  meta: null    },
        { level: 'INFO',  color: 'text-green-400', msg: 'POST /api/orders → 201',      meta: '38ms'  },
        { level: 'ERROR', color: 'text-red-400',   msg: 'Circuit OPEN · svc-c',        meta: null    },
    ];

    return (
        <div className="mt-6 p-3 bg-background rounded-xl border border-border font-mono text-[10px] space-y-2">
            {logs.map((log, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.14, duration: 0.3 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-2 min-w-0"
                >
                    <span className={`font-bold shrink-0 ${log.color}`}>{log.level}</span>
                    <span className="text-text-muted truncate flex-1">{log.msg}</span>
                    {log.meta && (
                        <span className="text-text-muted shrink-0 ml-auto">{log.meta}</span>
                    )}
                </motion.div>
            ))}
        </div>
    );
}

/** Animated SVG line — Auto-Scaling Signals */
function ScalingVisual() {
    const pts = [18, 22, 20, 30, 28, 42, 40, 55, 58, 62, 72, 80];
    const W = 100;
    const H = 48;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const norm = pts.map(p => H - ((p - min) / (max - min)) * (H - 4) - 2);

    const linePath = norm
        .map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * W} ${y}`)
        .join(' ');
    const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

    return (
        <div className="mt-6 p-4 bg-background rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-text-muted">req/s forecast</span>
                <span className="text-[10px] font-bold font-mono text-primary">↑ 42%</span>
            </div>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-12"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="scaleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#scaleGrad)" />
                <motion.path
                    d={linePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                    viewport={{ once: true }}
                />
            </svg>
            <div className="flex justify-between mt-1 text-[9px] text-text-muted">
                <span>now</span>
                <span>+5min</span>
                <span>+10min</span>
            </div>
        </div>
    );
}

/* ─────────────────────────── Feature Data ─────────────────────────── */

const features = [
    {
        icon: Activity,
        title: 'Adaptive Rate Limiting',
        description: 'ML-driven limits that adjust to traffic patterns in real-time. No more guesswork.',
        Visual: RateLimitVisual,
    },
    {
        icon: Shield,
        title: 'Smart Circuit Breaking',
        description: 'Automatic failure detection with intelligent recovery timing.',
        Visual: CircuitBreakerVisual,
    },
    {
        icon: GitBranch,
        title: 'Real-time Tracing',
        description: 'Distributed tracing across all your services with zero config.',
        Visual: TraceVisual,
    },
    {
        icon: Heart,
        title: 'Health-Aware Routing',
        description: 'Route traffic away from struggling services before they fail.',
        Visual: HealthRoutingVisual,
    },
    {
        icon: FileCode,
        title: 'Structured Logging',
        description: 'Query-ready logs with automatic context enrichment.',
        Visual: LoggingVisual,
    },
    {
        icon: TrendingUp,
        title: 'Auto-Scaling Signals',
        description: 'Proactive scaling signals based on traffic predictions.',
        Visual: ScalingVisual,
    },
];

/* ─────────────────────────── Animations ─────────────────────────── */

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

/* ─────────────────────────── Card ─────────────────────────── */

function FeatureCard({ feature, className = '' }) {
    const Icon = feature.icon;
    const Visual = feature.Visual;

    return (
        <motion.div
            variants={cardVariants}
            whileHover={{ scale: 1.02 }}
            className={`bg-surface border border-border rounded-2xl p-6 transition-all duration-300 hover:border-border-hover hover:glow-amber ${className}`}
        >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
            </div>

            <h3 className="font-semibold text-text-primary mb-2 text-lg">
                {feature.title}
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
            </p>

            <Visual />
        </motion.div>
    );
}

/* ─────────────────────────── Section ─────────────────────────── */

export function FeaturesBento() {
    return (
        <Section id="features">
            <SectionHeader
                title="Built for Scale"
                subtitle="Everything you need to manage traffic intelligently"
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {features.map((feature, index) => (
                    <FeatureCard key={index} feature={feature} />
                ))}
            </motion.div>
        </Section>
    );
}
