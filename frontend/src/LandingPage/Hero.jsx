import { motion } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-background">
                <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-20 text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border mb-8"
                >
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm text-text-secondary">Now in Public Beta</span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
                >
                    <span className="text-text-primary">API Gateway</span>
                    <br />
                    <span className="gradient-text">That Thinks</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10"
                >
                    Self-healing traffic management for distributed systems that learns, adapts, and protects.
                    Zero downtime, infinite scale.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                >
                    <Button size="lg" className="group">
                        Get Started
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" size="lg">
                        <Github className="w-5 h-5" />
                        View on GitHub
                    </Button>
                </motion.div>

                {/* Code Window Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
                        {/* Window Header */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background-secondary">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-accent-red/60" />
                                <div className="w-3 h-3 rounded-full bg-primary/60" />
                                <div className="w-3 h-3 rounded-full bg-success/60" />
                            </div>
                            <span className="text-xs text-text-muted font-mono ml-4">gateway.config.yaml</span>
                        </div>

                        {/* Code Content */}
                        <div className="p-6 text-left font-mono text-sm overflow-x-auto">
                            <pre className="text-text-secondary">
                                <code>
                                    <span className="text-primary">gateway</span>:<br />
                                    {'  '}<span className="text-secondary">port</span>: <span className="text-success">8080</span><br />
                                    {'  '}<span className="text-secondary">adaptive</span>: <span className="text-success">true</span><br />
                                    <br />
                                    <span className="text-primary">routing</span>:<br />
                                    {'  '}<span className="text-secondary">health_aware</span>: <span className="text-success">true</span><br />
                                    {'  '}<span className="text-secondary">circuit_breaker</span>:<br />
                                    {'    '}<span className="text-text-muted">threshold</span>: <span className="text-success">5</span><br />
                                    {'    '}<span className="text-text-muted">timeout</span>: <span className="text-success">30s</span><br />
                                    <br />
                                    <span className="text-primary">rate_limiting</span>:<br />
                                    {'  '}<span className="text-secondary">algorithm</span>: <span className="text-text-primary">"adaptive"</span><br />
                                    {'  '}<span className="text-secondary">learning</span>: <span className="text-success">true</span>
                                </code>
                            </pre>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
