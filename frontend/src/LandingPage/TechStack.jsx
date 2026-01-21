import { motion } from 'framer-motion';
import { Section, SectionHeader } from './ui/Section';

const technologies = [
    { name: 'Node.js', logo: 'N' },
    { name: 'React', logo: 'R' },
    { name: 'MongoDB', logo: 'M' },
    { name: 'Redis', logo: 'R' },
    { name: 'Docker', logo: 'D' },
    { name: 'Kubernetes', logo: 'K' },
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
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
};

export function TechStack() {
    return (
        <Section className="bg-background-secondary">
            <SectionHeader
                title="Built with Modern Tools"
                subtitle="Enterprise-grade technology stack you can trust"
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
            >
                {technologies.map((tech, index) => (
                    <motion.div
                        key={tech.name}
                        variants={itemVariants}
                        whileHover={{ scale: 1.1 }}
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-surface border border-border flex items-center justify-center transition-all duration-300 group-hover:border-primary/50 group-hover:glow-amber">
                            <span className="text-2xl md:text-3xl font-bold text-text-muted group-hover:text-primary transition-colors">
                                {tech.logo}
                            </span>
                        </div>
                        <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">
                            {tech.name}
                        </span>
                    </motion.div>
                ))}
            </motion.div>
        </Section>
    );
}
