import { API_BASE } from "../api-base";

/**
 * Static integration copy for the developer dashboard. No sample keys,
 * payments or stats live here: those come only from the API.
 */
export const integrationSnippet = `curl -X POST ${API_BASE}/api/v1/payment-links \\
  -H "X-Api-Key: <your server key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "walletId": 1,
    "amount": 1500,
    "currency": "GMD",
    "description": "Order #1042"
  }'`;
