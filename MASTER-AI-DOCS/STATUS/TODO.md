# Documentation TODO

This document tracks outstanding tasks required to complete the master documentation.

## Undocumented Modules/Features

*   **Health-Aware Routing:** The logic for how the gateway routes traffic based on backend health is not documented.
*   **Abnormal Traffic Pattern Detection:** The mechanism for detecting abnormal traffic is mentioned in the SRS but has no corresponding documentation.
*   **Authentication Flow:** The detailed flow for JWT and API Key validation is not documented.

## Unclear Logic

*   **Adaptive Rate Limiting Algorithm:** The specific algorithm for how backend latency and error rates translate into adjusted rate limits needs to be defined.
*   **Circuit Breaker Health Score:** The formula for calculating the `health` score of a service is not specified.
*   **Configuration Reloading:** The exact mechanism and trigger for hot-reloading configuration from the database is unclear.

## Missing Schemas

*   ~~**`Configs` Collection:**~~ Resolved — see `DATA_STRUCTURES/OVERVIEW.md`.
*   ~~**`Backends` Collection:**~~ Resolved — see `DATA_STRUCTURES/OVERVIEW.md`.
*   ~~**`Routes` Collection:**~~ Resolved — see `DATA_STRUCTURES/OVERVIEW.md`.
*   ~~**`Analytics` Collection:**~~ Resolved — see `DATA_STRUCTURES/OVERVIEW.md`.
*   ~~**`ClientProfiles` Collection:**~~ Resolved — see `DATA_STRUCTURES/OVERVIEW.md`.
*   ~~**`ApiKeys` Collection:**~~ Resolved — see `DATA_STRUCTURES/OVERVIEW.md`.

## Missing Flows

*   **User Authentication Flow:** A diagram and step-by-step description of the user login and session management process.
*   **Dynamic Configuration Update Flow:** A flow describing how an admin updates a setting on the dashboard and how it propagates through the system.

## Required Clarifications

*   **`gatewayOverhead` Metric:** Clarification is needed on how this value is calculated.
*   **Production Deployment:** The `docker-compose-prod.yml` file implies a production setup, but detailed documentation on networking, volume mapping, and secret management is missing.

## Resolved

*   ~~**Synthetic Data Seeder:**~~ Resolved — see `BACKEND/MODULE_SEEDER.md` and `scripts/seedSyntheticData.js`.

