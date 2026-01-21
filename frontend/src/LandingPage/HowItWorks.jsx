import { motion } from 'framer-motion';
import { Download, Settings, BarChart3 } from 'lucide-react';
import { Section, SectionHeader } from './ui/Section';

const steps = [
    {
        number: '01',
        icon: Download,
        title: 'Deploy',
        description: 'Single binary deployment. Docker, Kubernetes, or bare metal. Takes 60 seconds.',
    },
    {
        number: '02',
        icon: Settings,
        title: 'Configure',
        description: 'Simple YAML config for routes. Smart defaults mean minimal setup required.',
    },
    {
        number: '03',
        icon: BarChart3,
        title: 'Monitor',
        description: 'Real-time dashboard with insights. Watch your gateway learn and adapt.',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export function HowItWorks() {
    return (
        <Section id="how-it-works" className="bg-background-secondary">
            <SectionHeader
                title="Get Started in Minutes"
                subtitle="From zero to production-ready in three simple steps"
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="relative"
            >
                {/* Connection Line */}
                <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="grid md:grid-cols-3 gap-12 md:gap-16">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={stepVariants}
                                className="relative text-center"
                            >
                                {/* Step Number */}
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-6 relative">
                                    <Icon className="w-7 h-7 text-primary" />
                                    <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-background text-xs font-bold flex items-center justify-center">
                                        {step.number}
                                    </span>
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-semibold text-text-primary mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
                                    {step.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </Section>
    );
}
