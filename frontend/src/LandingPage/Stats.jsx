import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Section } from './ui/Section';

const stats = [
    { value: 99.9, suffix: '%', label: 'Uptime SLA' },
    { value: 5, prefix: '<', suffix: 'ms', label: 'Overhead' },
    { value: 1, suffix: 'M+', label: 'Requests/min' },
    { value: 0, suffix: '', label: 'Zero Config', displayValue: 'Zero' },
];

function useCountUp(end, duration = 2000) {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        if (!hasStarted) return;

        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Use easeOutExpo for smooth ending
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * end);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, hasStarted]);

    return { count, start: () => setHasStarted(true) };
}

function StatCard({ stat, index }) {
    const { count, start } = useCountUp(stat.value, 2000);

    const formatNumber = (num) => {
        if (stat.displayValue) return stat.displayValue;
        if (Number.isInteger(stat.value)) return Math.round(num);
        return num.toFixed(1);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            onViewportEnter={start}
            className="text-center p-6 md:p-8"
        >
            <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-2">
                {stat.prefix}
                <span className="font-mono">{formatNumber(count)}</span>
                {stat.suffix}
            </div>
            <div className="text-sm md:text-base text-text-secondary">
                {stat.label}
            </div>
            <div className="w-12 h-0.5 bg-primary mx-auto mt-4" />
        </motion.div>
    );
}

export function Stats() {
    return (
        <Section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                {stats.map((stat, index) => (
                    <StatCard key={index} stat={stat} index={index} />
                ))}
            </div>
        </Section>
    );
}
