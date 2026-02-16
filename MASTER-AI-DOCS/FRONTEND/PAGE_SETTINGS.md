# Page: Settings

## 1. Responsibility

This page provides a user interface for administrators to view and update system settings.

## 2. Workflow

1.  An administrator navigates to the Settings page.
2.  The component fetches the current settings from the `/api/settings` endpoint.
3.  The settings are displayed in a form.
4.  The administrator can modify the settings and click a "Save" button.
5.  When the form is submitted, a `POST` request is sent to `/api/settings` with the new settings.
6.  A success or error message is displayed to the user.

## 3. Interfaces

| Type | Name | Description |
| :--- | :--- | :--- |
| **UI** | Settings Page | The main view for managing settings. |
| **UI** | Settings Form | The form containing the various setting inputs. |
| **API Call** | `GET /api/settings` | Fetches the current settings. |
| **API Call** | `POST /api/settings` | Updates the settings. |

## 4. Dependencies

*   **Internal Components:** `DashboardLayout.jsx`, `Input.jsx`, `Button.jsx`
*   **External Libs:** `react`, `fetch` or `axios`.

## 5. State Handling

*   `settings`: An object representing the current settings.
*   `isLoading`: A boolean for loading states.
*   `isSaving`: A boolean to indicate when the settings are being saved.
*   `error`: Stores any API error.
*   `successMessage`: A message to display on successful save.
