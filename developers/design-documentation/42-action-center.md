# 42 - Action Center

## Overview

The Action Center is a centralized order approval system for semi-automated trading. When enabled, orders are queued for manual approval before execution, essential for managed accounts and regulatory compliance (RA - Relationship Advisor mode).

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-action-center-architecture.png" alt="Action Center architecture: order services call should_route_to_pending, semi-auto orders are queued to pending_orders and surfaced via Socket.IO in the React Action Center, approved orders are executed by execute_approved_order"><figcaption></figcaption></figure>

## Order Mode Configuration

### Setting Order Mode

```python
# Via API Key settings page
order_mode = 'auto'       # Direct execution (default)
order_mode = 'semi_auto'  # Queue for approval
```

### Mode Toggle API

```
POST /apikey/mode
Content-Type: application/json

{"user_id": "admin", "mode": "semi_auto"}
```

Both `user_id` and `mode` are required. `mode` must be exactly `auto` or `semi_auto`; anything else returns HTTP 400.

## Semi-Auto Workflow

<figure><img src="../../.gitbook/assets/diagram-action-center-semi-auto-flow.png" alt="Semi-auto flow: immediate-execution check, order mode check, queue_order stores and emits, then approve, reject or ignore in the Action Center"><figcaption></figcaption></figure>

## Database Schema

### pending_orders Table

```
┌─────────────────────────────────────────────────────────────────┐
│                      pending_orders table                       │
├─────────────────┬──────────────┬────────────────────────────────┤
│ Column          │ Type         │ Description                    │
├─────────────────┼──────────────┼────────────────────────────────┤
│ id              │ INTEGER PK   │ Unique order identifier        │
│ user_id         │ VARCHAR(255) │ User who placed order          │
│ api_type        │ VARCHAR(50)  │ Order type                     │
│ order_data      │ TEXT         │ JSON order details             │
│ created_at      │ DATETIME     │ Creation time (UTC)            │
│ created_at_ist  │ VARCHAR(50)  │ Creation time (IST)            │
│ status          │ VARCHAR(20)  │ pending/approved/rejected      │
│ approved_at     │ DATETIME     │ Approval time (UTC)            │
│ approved_at_ist │ VARCHAR(50)  │ Approval time (IST)            │
│ approved_by     │ VARCHAR(255) │ Approver username              │
│ rejected_at     │ DATETIME     │ Rejection time (UTC)           │
│ rejected_at_ist │ VARCHAR(50)  │ Rejection time (IST)           │
│ rejected_by     │ VARCHAR(255) │ Rejector username              │
│ rejected_reason │ TEXT         │ Reason for rejection           │
│ broker_order_id │ VARCHAR(255) │ Broker's order ID              │
│ broker_status   │ VARCHAR(20)  │ complete/open/rejected         │
└─────────────────┴──────────────┴────────────────────────────────┘
```

### Indexes

```sql
CREATE INDEX idx_user_status ON pending_orders(user_id, status);
CREATE INDEX idx_created_at ON pending_orders(created_at);
```

## Executor-Supported Queued Types

| API Type | Description | Service called on approval |
|----------|-------------|----------------------------|
| placeorder | Standard order | `place_order_service.place_order` |
| smartorder | Position-aware order | `place_smart_order_service.place_smart_order` |
| basketorder | Multiple orders | `basket_order_service.place_basket_order` |
| splitorder | Split large orders | `split_order_service.split_order` |
| optionsorder | Options contracts | `place_options_order_service.place_options_order` |
| optionsmultiorder | Multi-leg options order | `options_multiorder_service.place_options_multiorder` |
| placegttorder | GTT order placement | `place_gtt_order_service.place_gtt_order` |

Approval dispatch in `services/pending_order_execution_service.py` handles these seven API types. Any other `api_type` is answered with `Unknown order type: <api_type>` and HTTP 400, and the row's broker status is set to `rejected`.

`placegttorder` is handled specially on success: the executor stores the broker's `trigger_id` as `broker_order_id` and sets `broker_status` to `open`. If the GTT placement succeeds without a trigger ID, the row is marked rejected and the call returns HTTP 502.

`calculate_action_center_stats()` reports a counter per API type as well: `total_placeorder`, `total_smartorder`, `total_basketorder`, `total_splitorder`, `total_optionsorder`, `total_optionsmultiorder` and `total_placegttorder`.

## Restricted Operations

These operations are never queued. Read-only operations execute immediately; destructive operations apply their own service policy and are blocked in semi-auto mode unless analyzer behavior explicitly permits them. The set is `IMMEDIATE_EXECUTION_OPERATIONS` in `services/order_router_service.py`, and `should_route_to_pending()` compares against it case-insensitively.

| Operation | Reason |
|-----------|--------|
| closeposition | Blocked by close-position service in semi-auto live mode |
| closeallpositions | Blocked by close-position service in semi-auto live mode |
| cancelorder | Blocked by cancel-order service in semi-auto live mode |
| cancelallorder | Blocked by cancel-all service in semi-auto live mode |
| modifyorder | Blocked by modify-order service in semi-auto live mode |
| modifygttorder / cancelgttorder | Blocked because a delayed change may target a stale trigger |
| gttorderbook | Data retrieval |
| orderstatus | Status query |
| orderbook | Data retrieval |
| tradebook | Data retrieval |
| positions / openposition | Data retrieval |
| holdings | Data retrieval |
| funds | Data retrieval |

## API Endpoints

All Action Center routes are defined on `orders_bp` (`blueprints/orders.py`, `url_prefix="/"`) and require a valid session. Every route except `/action-center/count` also carries `@limiter.limit(API_RATE_LIMIT)`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/action-center` | GET | Server-rendered page (the React SPA serves the same path) |
| `/action-center/api/data` | GET | Orders and statistics as JSON |
| `/action-center/approve/<order_id>` | POST | Approve and execute one order |
| `/action-center/reject/<order_id>` | POST | Reject one order |
| `/action-center/delete/<order_id>` | DELETE | Delete one non-pending order |
| `/action-center/approve-all` | POST | Approve and execute every pending order |
| `/action-center/count` | GET | Pending count for the nav badge |

### Get Orders

```
GET /action-center/api/data?status=pending
```

`status` accepts `pending`, `approved`, `rejected` or `all`, and defaults to `pending`. Statistics are always calculated over all of the user's orders, not just the filtered subset.

**Response:**
```json
{
    "status": "success",
    "data": {
        "orders": [
            {
                "id": 1,
                "user_id": "admin",
                "api_type": "placeorder",
                "status": "pending",
                "created_at_ist": "2024-01-15 09:30:00 IST",
                "strategy": "MyStrategy",
                "symbol": "SBIN",
                "exchange": "NSE",
                "action": "BUY",
                "quantity": 100,
                "price": "0",
                "trigger_price": "0",
                "price_type": "MARKET",
                "product_type": "MIS",
                "broker_order_id": null,
                "broker_status": null,
                "raw_order_data": {}
            }
        ],
        "statistics": {
            "total_pending": 3,
            "total_approved": 15,
            "total_rejected": 2,
            "total_buy_orders": 10,
            "total_sell_orders": 10,
            "total_placeorder": 20,
            "total_smartorder": 0,
            "total_basketorder": 0,
            "total_splitorder": 0,
            "total_optionsorder": 0,
            "total_optionsmultiorder": 0,
            "total_placegttorder": 0
        }
    }
}
```

`raw_order_data` is the stored payload with `apikey` and `api_key` stripped out.

### Approve Order

```
POST /action-center/approve/{order_id}
```

**Response:**
```json
{
    "status": "success",
    "message": "Order approved and executed successfully",
    "broker_order_id": "123456789"
}
```

If the order is approved but broker execution fails, the response is `{"status": "warning", "message": "Order approved but execution failed", "error": "..."}` returned with the service's own status code.

### Reject Order

```
POST /action-center/reject/{order_id}
Content-Type: application/json

{"reason": "Invalid price level"}
```

### Approve All

```
POST /action-center/approve-all
```

**Response:**
```json
{
    "status": "success",
    "message": "Successfully approved and executed all 5 orders",
    "approved_count": 5,
    "executed_count": 5,
    "failed_executions": []
}
```

`status` is `success` when every approved order executed, `warning` when some executed, and `error` when none did. With nothing pending, the response is `{"status": "info", "message": "No pending orders to approve"}`.

### Delete Order

```
DELETE /action-center/delete/{order_id}
```

Note: Only approved or rejected orders can be deleted.

### Get Pending Count

```
GET /action-center/count
```

**Response:**
```json
{
    "count": 3
}
```

## Real-Time Updates

### SocketIO Events

| Event | Trigger | Data |
|-------|---------|------|
| pending_order_created | New order queued by `order_router_service.queue_order()` | `pending_order_id`, `user_id`, `api_type`, `message` |
| pending_order_updated | Approve, reject, delete or approve-all | `action` (`approved`, `rejected`, `deleted` or `batch_approved`), `order_id`, `user_id`. The batch variant sends `count` instead of `order_id` |

`pending_order_created` is emitted through `socketio.start_background_task()` and is best-effort: if the emit fails, the queued row still stands and the caller still receives a success response.

### Frontend Handling

```typescript
// Listen for new orders
socket.on('pending_order_created', () => {
    playAlertSound();
    showToast('New order pending approval');
    refreshOrders();
});

// Listen for status changes
socket.on('pending_order_updated', () => {
    refreshOrders();
});
```

## React Component Features

### Tabbed Interface

```
[Pending (3)]  [Approved]  [Rejected]  [All Orders]
     ↓
  (pulse animation when pending > 0)
```

### Statistics Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Pending: 3    │    Buy: 2    │    Sell: 1    │    Approved: 15 │
│  (yellow)           (green)        (red)            (green)     │
└─────────────────────────────────────────────────────────────────┘
```

### Order Table Columns

| Column | Content |
|--------|---------|
| Strategy | Strategy name |
| Symbol | Trading symbol |
| Exchange | NSE/NFO/MCX badge |
| Action | BUY (green) / SELL (red) |
| Quantity | Order quantity |
| Price | Price or "MARKET" |
| Order Type | placeorder/smartorder/etc |
| Product | CNC/MIS/NRML badge |
| Created | Relative time ("5 min ago") |
| Actions | Approve/Reject/Delete buttons |

### Expandable Details

Click chevron to view raw order data:

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ Order Details                                                │
│                                                                 │
│  apikey: ****                                                   │
│  strategy: MyStrategy                                           │
│  symbol: SBIN                                                   │
│  exchange: NSE                                                  │
│  action: BUY                                                    │
│  quantity: 100                                                  │
│  pricetype: MARKET                                              │
│  product: MIS                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Service Implementation

### Order Router

```python
def should_route_to_pending(api_key, api_type=None):
    """Return True only for queue-eligible requests in semi-auto mode."""
    if api_type and api_type.lower() in IMMEDIATE_EXECUTION_OPERATIONS:
        return False
    user_id = verify_api_key(api_key)
    if not user_id:
        return False
    return get_order_mode(user_id) == 'semi_auto'
```

Any exception inside `should_route_to_pending()` is caught and returns `False`, so an unexpected failure falls back to immediate execution rather than silently queueing.

### Queue Order

```python
def queue_order(api_key, order_data, api_type):
    """Queue order for approval"""
    user_id = verify_api_key(api_key)
    if not user_id:
        return False, {'status': 'error', 'message': 'Invalid API key'}, 403

    # The API key is stripped before the payload is persisted
    order_data_clean = order_data.copy()
    order_data_clean.pop('apikey', None)

    pending_order_id = create_pending_order(user_id, api_type, order_data_clean)

    # Emit best-effort UI notification after persistence.
    socketio.start_background_task(
        socketio.emit,
        'pending_order_created',
        {
            'pending_order_id': pending_order_id,
            'user_id': user_id,
            'api_type': api_type,
            'message': f'New {api_type} order queued for approval',
        },
    )

    return True, {
        'status': 'success',
        'message': 'Order queued for approval in Action Center',
        'mode': 'semi_auto',
        'pending_order_id': pending_order_id
    }, 200
```

### Execute Approved Order

```python
def execute_approved_order(pending_order_id) -> tuple[bool, dict, int]:
    """Execute approved order with broker"""
    pending_order = get_pending_order_by_id(pending_order_id)
    if not pending_order:
        return False, {'status': 'error', 'message': 'Pending order not found'}, 404

    # Only a row already marked 'approved' can be executed
    if pending_order.status != 'approved':
        return False, {'status': 'error', 'message': '...'}, 400

    order_data = json.loads(pending_order.order_data)

    # Credentials are resolved at execution time, never stored on the row
    api_key = get_api_key_for_tradingview(pending_order.user_id)
    auth_token = get_auth_token(pending_order.user_id)
    broker = Auth.query.filter_by(name=pending_order.user_id).first().broker

    # Route to appropriate service on pending_order.api_type
    if pending_order.api_type == 'placeorder':
        success, response_data, status_code = place_order(
            order_data=order_data, api_key=api_key, auth_token=auth_token, broker=broker
        )
    # ... six other types

    update_broker_status(pending_order_id, broker_order_id, broker_status)
    return success, response_data, status_code
```

Passing `auth_token` and `broker` into the service is what stops the approved order from being routed back into the pending queue a second time. If any of `api_key`, `auth_token` or `broker` is missing, the row is marked rejected and the call returns HTTP 403.

Batch responses (basket and split orders) are flattened by `_flatten_execution_results()` and the resulting broker order IDs are joined into the 255 character `broker_order_id` column, truncated to `<first_id> (+N more)` when they do not fit.

## Security & Compliance

### Audit Trail

All actions are logged with:
- Timestamp (IST)
- Username
- Action taken
- Reason (for rejections)

### API Key Security

- API keys never stored in pending_orders
- Only user_id reference maintained
- Keys retrieved at execution time

### Analyzer Mode Restriction

When in semi_auto mode, the API-key path of the analyzer toggle (`services/analyzer_service.py`) is blocked with HTTP 403 to ensure SEBI Research Analyst compliance: mode switching stays a client-only decision made through the UI. Internal calls that already carry `auth_token` and `broker` are not affected.

## Key Files Reference

| File | Purpose |
|------|---------|
| `database/action_center_db.py` | PendingOrder model |
| `services/action_center_service.py` | Order parsing, stats |
| `services/order_router_service.py` | Route decisions |
| `services/pending_order_execution_service.py` | Execute approved |
| `blueprints/orders.py` | Action center routes |
| `blueprints/apikey.py` | Mode toggle |
| `frontend/src/pages/ActionCenter.tsx` | React UI |
