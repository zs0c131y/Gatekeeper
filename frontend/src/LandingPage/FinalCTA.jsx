import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Section } from './ui/Section';
import { Button } from './ui/Button';

export function FinalCTA() {
    return (
        <Section className="relative overflow-hidden" id="docs">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative text-center"
            >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
                    Transform Your API Infrastructure
                </h2>
                <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10">
                    Join thousands of developers building resilient, intelligent APIs.
                    Open source and free to use.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button size="lg" className="group glow-amber-intense">
                        Start Building Now
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" size="lg">
                        <BookOpen className="w-5 h-5" />
                        Read Documentation
                    </Button>
                </div>

                <p className="mt-8 text-sm text-text-muted">
                    No credit card required • MIT License • Community driven
                </p>
            </motion.div>
        </Section>
    );
}
