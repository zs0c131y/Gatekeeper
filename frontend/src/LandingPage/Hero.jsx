import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from './ui/Button';

function ParticleCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];

        function resize() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.5,
                dx: (Math.random() - 0.5) * 0.3,
                dy: (Math.random() - 0.5) * 0.3,
                o: Math.random() * 0.4 + 0.1,
            };
        }

        for (let i = 0; i < 60; i++) particles.push(createParticle());

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(245, 158, 11, ${p.o})`;
                ctx.fill();
            }
            animId = requestAnimationFrame(draw);
        }
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
        />
    );
}

export function Hero() {
    const sectionRef = useRef(null);

    // Tracks how far the hero section has scrolled out of the viewport
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end start'],
    });

    // Background blobs — fastest layers, create depth
    const blob1Y = useTransform(scrollYProgress, [0, 1], [0, -180]);
    const blob2Y = useTransform(scrollYProgress, [0, 1], [0, 120]);

    // Text — moves up slightly faster than normal scroll (foreground feel)
    const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);

    // Code window — lags behind scroll (floats, feels like a separate depth layer)
    const codeY = useTransform(scrollYProgress, [0, 1], [0, 60]);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        >
            {/* ── Parallax Background Blobs ── */}
            <div className="absolute inset-0 bg-background pointer-events-none">
                <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
                <motion.div
                    style={{ y: blob1Y }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"
                />
                <motion.div
                    style={{ y: blob2Y }}
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-1000"
                />
            </div>

            <ParticleCanvas />

            {/* ── Content — normal document flow, centered by flex parent ── */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-20 text-center">

                {/* Text block — mild upward drift on scroll */}
                <motion.div style={{ y: contentY }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border mb-8"
                    >
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-sm text-text-secondary">Now in Public Beta</span>
                    </motion.div>

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

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10"
                    >
                        Self-healing traffic management for distributed systems that learns, adapts, and protects.
                        Zero downtime, infinite scale.
                    </motion.p>

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
                </motion.div>

                {/* Code window — separate parallax layer, lags behind text on scroll */}
                <motion.div style={{ y: codeY }} className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                    >
                        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
                            {/* Window chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background-secondary">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-accent-red/60" />
                                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                                    <div className="w-3 h-3 rounded-full bg-success/60" />
                                </div>
                                <span className="text-xs text-text-muted font-mono ml-4">
                                    gateway.config.yaml
                                </span>
                            </div>

                            {/* Code */}
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
                </motion.div>

            </div>
        </section>
    );
}
