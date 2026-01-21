import { motion } from 'framer-motion';
import { Activity, Shield, GitBranch, Heart, FileCode, TrendingUp } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';

const features = [
    {
        icon: Activity,
        title: 'Adaptive Rate Limiting',
        description: 'ML-driven limits that adjust to traffic patterns in real-time. No more guesswork.',
        hasChart: true,
    },
    {
        icon: Shield,
        title: 'Smart Circuit Breaking',
        description: 'Automatic failure detection with intelligent recovery timing.',
    },
    {
        icon: GitBranch,
        title: 'Real-time Tracing',
        description: 'Distributed tracing across all your services with zero config.',
    },
    {
        icon: Heart,
        title: 'Health-Aware Routing',
        description: 'Route traffic away from struggling services before they fail.',
    },
    {
        icon: FileCode,
        title: 'Structured Logging',
        description: 'Query-ready logs with automatic context enrichment.',
    },
    {
        icon: TrendingUp,
        title: 'Auto-Scaling Signals',
        description: 'Proactive scaling signals based on traffic predictions.',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

function FeatureCard({ feature, className = '' }) {
    const Icon = feature.icon;

    return (
        <motion.div
            variants={cardVariants}
            whileHover={{ scale: 1.02 }}
            className={`bg-surface border border-border rounded-2xl p-6 transition-all duration-300 hover:border-border-hover hover:glow-amber ${className}`}
        >
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
            </div>

            {/* Content */}
            <h3 className="font-semibold text-text-primary mb-2 text-lg">
                {feature.title}
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
            </p>

            {/* Visual for chart card */}
            {feature.hasChart && (
                <div className="mt-6 p-4 bg-background rounded-xl border border-border">
                    {/* Animated chart mockup */}
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
            )}
        </motion.div>
    );
}

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
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {features.map((feature, index) => (
                    <FeatureCard key={index} feature={feature} />
                ))}
            </motion.div>
        </Section>
    );
}
