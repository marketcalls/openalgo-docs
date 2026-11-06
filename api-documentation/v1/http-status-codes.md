# HTTP Status Codes

The status codes contain the following

| Status Code | Meaning                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| 200         | Request handled; eligible Semi-Auto orders may only be queued for approval                                                     |
| 400         | Bad request. Invalid JSON, schema validation failure, or an invalid request state |
| 401         | Authorization error. User could not be authenticated                       |
| 403         | Permission error. Invalid API key, missing broker session, or blocked by mode/policy |
| 404         | Broker module, symbol, order, or linked messaging user not found           |
| 409         | Conflict. The server is in the wrong state for the operation (for example, WhatsApp is not paired) |
| 422         | Request understood but not processable (portfolio analytics with missing or incompatible history) |
| 429         | Rate limit, or a broker queue/guard refusal before sending. Read the response message. |
| 500         | Internal server error.                                                     |
| 502         | Broker response/data unavailable; place/smart order can report a possible placement after a lost broker reply. Reconcile before retrying. |
| 501         | Not implemented for the connected broker (for example, GTT or margin on a broker without that module) |

A successful HTTP response is not proof of execution. Check `mode`, pending approval identifiers, and every batch child result. See [order outcomes and retries](README.md#order-outcomes-and-retries).

## Schema Validation Returns 400

Request bodies are validated by marshmallow schemas that do not allow unknown fields. Sending a field the schema does not declare returns HTTP 400 with the offending key named in `message`, even when every other field is correct. Use the request-body table on each endpoint page as the exact allowed field set.

The two exceptions are the GTT place and modify schemas, which silently drop unknown fields, and chart preferences, which is designed to accept arbitrary preference keys.
