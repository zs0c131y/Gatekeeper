/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // AMOLED Dark
                background: {
                    DEFAULT: '#000000',
                    secondary: '#0a0a0a',
                },
                surface: {
                    DEFAULT: '#111111',
                    hover: '#1a1a1a',
                },
                border: {
                    DEFAULT: '#262626',
                    hover: '#333333',
                },
                // Amber/Gold Accents
                primary: {
                    DEFAULT: '#f59e0b',
                    light: '#fbbf24',
                    dark: '#d97706',
                },
                // Secondary - Orange/Red
                secondary: {
                    DEFAULT: '#fb923c',
                },
                'accent-red': '#ef4444',
                // Success
                success: '#10b981',
                // Text
                'text-primary': '#e5e5e5',
                'text-secondary': '#a3a3a3',
                'text-muted': '#737373',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.1)' },
                    '50%': { boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)' },
                },
            },
        },
    },
    plugins: [],
}
