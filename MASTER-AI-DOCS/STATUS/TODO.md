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

*   **`Configs` Collection:** The detailed schema is not available.
*   **`Backends` Collection:** The detailed schema is not available.
*   **`Routes` Collection:** The detailed schema is not available.
*   **`Analytics` Collection:** The detailed schema for aggregated metrics is not available.
*   **`ClientProfiles` Collection:** The detailed schema is not available.
*   **`ApiKeys` Collection:** The detailed schema is not available.

## Missing Flows

*   **User Authentication Flow:** A diagram and step-by-step description of the user login and session management process.
*   **Dynamic Configuration Update Flow:** A flow describing how an admin updates a setting on the dashboard and how it propagates through the system.

## Required Clarifications

*   **`gatewayOverhead` Metric:** Clarification is needed on how this value is calculated.
*   **Production Deployment:** The `docker-compose-prod.yml` file implies a production setup, but detailed documentation on networking, volume mapping, and secret management is missing.
