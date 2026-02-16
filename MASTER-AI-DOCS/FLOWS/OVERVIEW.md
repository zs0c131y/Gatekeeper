# System Flows

## 1. API Request Lifecycle

1.  A **Client** sends a request to the **Gateway**.
2.  The **Security** module authenticates the request (JWT, API Key).
3.  The **Rate Limiter** module checks if the client has exceeded its limit.
4.  The **Circuit Breaker** module checks if the target backend service is healthy (`CLOSED` state).
5.  The **Logger** module generates a Trace ID and records the initial request data.
6.  The **Request Routing** module forwards the request to the appropriate **Backend** service, injecting the Trace ID.
7.  The response from the backend is received by the Gateway.
8.  The Logger module updates the log entry with response details (latency, status).
9.  The **Analytics** module processes the completed log entry for metrics.
10. The **Dashboard** receives updated metrics via WebSocket.
11. The response is sent back to the Client.

## 2. Rate Limiting Flow

1.  An incoming request is identified by client.
2.  The system queries Redis for the client's current token bucket status.
3.  The token bucket algorithm determines if the request is allowed.
4.  If allowed, the token count is decremented in Redis, and the request proceeds.
5.  If denied, the system returns an HTTP `429` response.
6.  Separately, the system dynamically adjusts the bucket's fill rate based on backend latency and error rates from the Analytics module.

## 3. Circuit Breaker Flow

1.  The system monitors backend service health using failure thresholds.
2.  **CLOSED State:** Requests are allowed. If failures exceed the threshold, the state changes to **OPEN**.
3.  **OPEN State:** Requests are immediately rejected. After a timeout, the state changes to **HALF_OPEN**.
4.  **HALF_OPEN State:** A limited number of requests are allowed through. If they succeed, the state returns to **CLOSED**. If they fail, it returns to **OPEN**.
5.  Periodic health checks are performed on services.

## 4. Logging Flow

1.  A request enters the gateway.
2.  The Logger module generates a unique Trace ID.
3.  The Trace ID is injected into the request headers.
4.  A log entry with the request details and Trace ID is created.
5.  When the response is received, the log entry is updated with response details.
6.  The completed log entry is stored in the `Logs` collection in MongoDB.
