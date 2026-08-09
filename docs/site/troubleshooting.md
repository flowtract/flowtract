---
layout: default
title: Errors and troubleshooting
---

# Errors and troubleshooting

| Code                            | Corrective action                                                   |
| ------------------------------- | ------------------------------------------------------------------- |
| `FLOWTRACT_CONFIG`              | Correct the named configuration or scenario lifecycle violation.    |
| `FLOWTRACT_DUPLICATE_OPERATION` | Give every registered operation a unique ID.                        |
| `FLOWTRACT_REQUEST_CONTRACT`    | Correct the declared request section and serializable shape.        |
| `FLOWTRACT_TRANSPORT`           | Inspect the bounded kind: abort, timeout, TLS, network, or unknown. |
| `FLOWTRACT_UNDECLARED_STATUS`   | Add an exact response status or `default`.                          |
| `FLOWTRACT_RESPONSE_PARSE`      | Correct content type, UTF-8, JSON, or empty-body handling.          |
| `FLOWTRACT_RESPONSE_CONTRACT`   | Correct the response or its Zod contract.                           |
| `FLOWTRACT_AUTH`                | Inspect create/setup/apply/dispose phase and remove collisions.     |
| `FLOWTRACT_INTERPOLATION`       | Define references and remove malformed, cyclic, or oversized input. |
| `FLOWTRACT_CLEANUP`             | Inspect every ordered failure; later disposal attempts already ran. |

`FlowtractError.toJSON()` is bounded, stack-free, cause-free, and JSON-safe.
When primary work and close both fail, `hasCleanupError(error)` exposes the
non-enumerable cleanup evidence without replacing the primary error.
