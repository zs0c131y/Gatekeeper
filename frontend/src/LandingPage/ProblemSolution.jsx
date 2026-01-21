import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';

const problems = [
    'Static rate limits that break under load',
    'Manual circuit breaker configuration',
    'Blind routing without health checks',
    'Scattered, unstructured logging',
    'No learning from traffic patterns',
];

const solutions = [
    'Adaptive rate limiting that learns',
    'Automatic circuit breaking with recovery',
    'Health-aware intelligent routing',
    'Structured, queryable logging',
    'ML-powered traffic optimization',
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

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
};

export function ProblemSolution() {
    return (
        <Section className="bg-background-secondary">
            <SectionHeader
                title="Why Gatekeeper?"
                subtitle="Traditional gateways are static. Yours should be intelligent."
            />

            <div className="grid md:grid-cols-2 gap-8 md:gap-16">
                {/* Problems */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="bg-surface border border-border rounded-2xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center">
                            <X className="w-5 h-5 text-accent-red" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary">Traditional Gateways</h3>
                    </div>

                    <ul className="space-y-4">
                        {problems.map((problem, index) => (
                            <motion.li
                                key={index}
                                variants={itemVariants}
                                className="flex items-start gap-3"
                            >
                                <X className="w-5 h-5 text-accent-red/60 mt-0.5 flex-shrink-0" />
                                <span className="text-text-secondary">{problem}</span>
                            </motion.li>
                        ))}
                    </ul>
                </motion.div>

                {/* Solutions */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="bg-surface border border-primary/30 rounded-2xl p-8 relative overflow-hidden"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-text-primary">Intelligent Gateway</h3>
                        </div>

                        <ul className="space-y-4">
                            {solutions.map((solution, index) => (
                                <motion.li
                                    key={index}
                                    variants={itemVariants}
                                    className="flex items-start gap-3"
                                >
                                    <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                                    <span className="text-text-primary">{solution}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            </div>
        </Section>
    );
}
