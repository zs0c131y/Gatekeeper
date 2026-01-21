# Gatekeeper Frontend

Premium landing page for the Intelligent Adaptive API Gateway.

## Quick Start

```bash
npm install
npm run dev
```

## Tech Stack

- **React 19** - UI Framework
- **Tailwind CSS 3** - Styling with custom AMOLED dark theme
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Vite 7** - Build tool

## Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#000000` | Main background |
| `surface` | `#111111` | Cards |
| `primary` | `#f59e0b` | Amber accent |
| `success` | `#10b981` | Success states |

### Custom CSS Classes
```css
.glass          /* Backdrop blur effect */
.gradient-text  /* Amber gradient text */
.glow-amber     /* Subtle amber glow */
```

## Components

Reusable components in `src/LandingPage/ui/`:

```jsx
// Button with variants
<Button variant="primary" size="lg">Get Started</Button>

// Dark glass card
<Card hover glow>Content</Card>

// Section wrapper
<Section id="features">
  <SectionHeader title="Title" subtitle="Subtitle" />
</Section>
```

## Customization

Edit `tailwind.config.js` to change theme colors:
```js
primary: { DEFAULT: '#f59e0b' }
```

## Build

```bash
npm run build    # Production build (~117KB gzipped)
npm run preview  # Preview production
npm run lint     # ESLint
```

## Structure

```
src/
├── LandingPage/     # All landing page sections
│   └── ui/          # Reusable components
├── lib/utils.js     # cn() utility
└── index.css        # Tailwind + custom styles
```
