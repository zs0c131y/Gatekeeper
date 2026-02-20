# Page: Analytics

## 1. Responsibility

The Analytics page provides a comprehensive analysis dashboard for the Gatekeeper API Gateway. It visualizes gateway performance, traffic patterns, latency profiles, client behavior, and threat signals through 6 distinct sections.

## 2. Layout & Sections

| # | Section | Component | Data Key |
|---|---------|-----------|----------|
| 1 | **KPI Summary** | 4 metric cards (Total Requests, Avg Latency, Error Rate, Throughput) | `kpi` |
| 2 | **Latency Distribution** | Gradient bar chart showing request counts per latency bucket | `latencyDistribution` |
| 3 | **HTTP Method Breakdown** | Donut chart with percentage legend (GET/POST/PUT/DELETE/PATCH) | `methodBreakdown` |
| 4 | **Client Activity & Threat Detection** | Sortable table with per-IP stats and risk badges (Low/Medium/High) | `clients` |
| 5 | **Hourly Traffic Pattern** | Stacked bar chart (requests vs errors by hour of day) | `hourlyTraffic` |
| 6 | **Top Error Endpoints** | Ranked list with progress bars showing relative error volume | `topErrorEndpoints` |

## 3. Interfaces

| Type | Name | Description |
| :--- | :--- | :--- |
| **UI Route** | `/dashboard/analytics` | Main analytics dashboard view. |
| **API Call** | `GET /api/analytics/analysis` | Single aggregated call that returns all analysis data. |

## 4. Dependencies

*   **Internal Components:** `DashboardLayout.jsx`, `Card`, `Button`, `LoadingSkeleton`, `ErrorMessage`, `EmptyState`
*   **External Libs:** `react`, `recharts`, `lucide-react`, `axios`
*   **Custom Hooks:** `useApi` with auto-refresh (30s interval)

## 5. State Handling

*   `data` — Full analysis payload from the API (`useApi` hook)
*   `loading` / `error` — Request lifecycle states
*   `autoRefresh` — Toggle for 30-second auto-refresh interval

## 6. Design System

*   Background: `bg-[#111111]`, borders: `border-white/10`
*   Accent colors: amber (primary), green (healthy), red (errors), blue (throughput)
*   Charts use gradient fills and dark tooltip styling
*   Client risk levels: `Low` (green), `Medium` (amber), `High` (red) with color-coded badges
