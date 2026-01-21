import { Github, Twitter, Zap } from 'lucide-react';

const footerLinks = {
    Product: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Changelog', href: '#changelog' },
        { label: 'Roadmap', href: '#roadmap' },
    ],
    Resources: [
        { label: 'Documentation', href: '#docs' },
        { label: 'API Reference', href: '#api' },
        { label: 'Guides', href: '#guides' },
        { label: 'Examples', href: '#examples' },
    ],
    Community: [
        { label: 'Discord', href: '#discord' },
        { label: 'GitHub', href: '#github' },
        { label: 'Twitter', href: '#twitter' },
        { label: 'Blog', href: '#blog' },
    ],
    Legal: [
        { label: 'Privacy', href: '#privacy' },
        { label: 'Terms', href: '#terms' },
        { label: 'License', href: '#license' },
    ],
};

export function Footer() {
    return (
        <footer className="border-t border-border bg-background-secondary">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <a href="#" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-semibold text-text-primary">Gatekeeper</span>
                        </a>
                        <p className="text-sm text-text-muted mb-4">
                            Intelligent API Gateway for modern distributed systems.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="#"
                                className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
                                aria-label="GitHub"
                            >
                                <Github className="w-4 h-4" />
                            </a>
                            <a
                                href="#"
                                className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
                                aria-label="Twitter"
                            >
                                <Twitter className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="font-medium text-text-primary mb-4 text-sm">
                                {category}
                            </h4>
                            <ul className="space-y-2">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="text-sm text-text-muted hover:text-text-primary transition-colors"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-text-muted">
                        © {new Date().getFullYear()} Gatekeeper. All rights reserved.
                    </p>
                    <p className="text-xs text-text-muted font-mono">
                        v1.0.0 • Built with React + Vite
                    </p>
                </div>
            </div>
        </footer>
    );
}
