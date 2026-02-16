# Module: Request Routing

## 1. Responsibility

This module is responsible for routing incoming client requests to the appropriate backend services based on configured rules.

## 2. Inputs

*   Incoming HTTP Request (URL, method, headers, params, body).
*   Routing rules from the `Routes` collection in the database.
*   Backend service definitions from the `Backends` collection.

## 3. Outputs

*   A forwarded HTTP request to a selected backend service.
*   An injected tracking header (Trace ID) in the forwarded request.

## 4. Dependencies

*   **Data:** `Routes` and `Backends` collections from MongoDB.

## 5. Interaction with Other Modules

*   **Logging & Tracing:** Receives a Trace ID to inject into the request headers.
*   **Configuration:** Reads routing and backend configuration.
*   **Circuit Breaker:** Checks the status of a backend's circuit breaker before forwarding the request.
