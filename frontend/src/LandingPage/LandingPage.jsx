import { Navigation } from './Navigation';
import { Hero } from './Hero';
import { ProblemSolution } from './ProblemSolution';
import { FeaturesBento } from './FeaturesBento';
import { HowItWorks } from './HowItWorks';
import { LiveMetrics } from './LiveMetrics';
import { TechStack } from './TechStack';
import { Stats } from './Stats';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';

function SectionDivider() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
    );
}

export function LandingPage() {
    return (
        <div className="min-h-screen bg-background overflow-x-hidden w-full">
            {/* Noise overlay */}
            <div className="noise-overlay" />

            {/* Navigation */}
            <Navigation />

            {/* Main Content */}
            <main className="relative">
                <Hero />

                <SectionDivider />
                <ProblemSolution />

                <SectionDivider />
                <FeaturesBento />

                <SectionDivider />
                <HowItWorks />

                <SectionDivider />
                <LiveMetrics />

                <SectionDivider />
                <TechStack />

                <SectionDivider />
                <Stats />

                <SectionDivider />
                <FinalCTA />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default LandingPage;
