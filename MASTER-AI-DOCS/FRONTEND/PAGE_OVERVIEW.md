# Page: Overview

## 1. Responsibility

This is the main dashboard page, providing a high-level overview of the system's status. It displays key metrics and summaries.

## 2. Workflow

1.  This is the default page after a user logs in.
2.  The component mounts and fetches data from the `/api/overview` endpoint.
3.  A loading indicator is shown.
4.  The fetched data is displayed in a series of cards or widgets.
5.  Data may be automatically refreshed at a regular interval via WebSocket.

## 3. Interfaces

| Type | Name | Description |
| :--- | :--- | :--- |
| **UI** | Overview Page | The main dashboard view. |
| **API Call** | `GET /api/overview` | Fetches the aggregated overview data. |
| **WebSocket** | Listens for real-time metric updates. |

## 4. Dependencies

*   **Internal Components:** `DashboardLayout.jsx`, `Card.jsx`
*   **External Libs:** `react`, `fetch` or `axios`.

## 5. State Handling

*   `overviewData`: An object containing the KPIs and other summary data.
*   `isLoading`: A boolean for the loading state.
*   `error`: Stores any API error.
