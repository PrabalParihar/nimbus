# HTTP API

Base URL: `http://127.0.0.1:3000`. JSON requests use `Content-Type: application/json` and responses are JSON. No authentication is implemented. All `/admin/*` routes are administrative. List routes return JSON arrays with no pagination. Unknown query parameters are rejected with 400. Request bodies are limited to 16 KiB. Unknown object fields, null bodies, fractional numbers, numeric strings and invalid IDs are rejected. Where a body is optional, omit it or send `{}`.

Identifiers and `Idempotency-Key`: 1–128 ASCII letters, digits, `.`, `_`, `:`, `-`; case sensitive. Generated cart/order IDs are UUIDs, coupon codes are `reward-<UUID>`. Example IDs below are shortened for readability. Prices and totals are **integer USD cents**, not dollar floats. Quantity is an integer 1–10000, with at most 100 distinct products in a cart. Carts do not reserve stock; adding more than current availability is allowed, but checkout revalidates every line.

## Response types

Product:

```json
{"id":"pen","name":"Comet Pen","unitPriceCents":105,"available":100}
```

Open cart (POST/GET/add/update/remove all return this shape):

```json
{
  "id":"cart-1","status":"open","orderId":null,"currency":"USD",
  "items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210,"available":100}],
  "subtotalCents":210
}
```

An empty cart has `items: []`, `subtotalCents: 0`. Open cart prices and `available` are current catalog values. A checked-out cart has `status: "checked_out"`, its `orderId`, and immutable purchased items/subtotal from that order, without live `available` fields. Cart subtotal is always before discounts; retrieve the order for the paid total.

Order:

```json
{
  "id":"order-1","cartId":"cart-1","currency":"USD",
  "items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210}],
  "subtotalCents":210,"discountPercent":10,"discountCents":21,"totalCents":189,
  "couponCode":"reward-example","placedAt":"2026-01-01T00:00:00.000Z"
}
```

Without a coupon: `discountPercent: 0`, `discountCents: 0`, `couponCode: null`. The percentage is applied once to the subtotal and rounded to the nearest cent, half up. Orders cannot be edited or cancelled.

Coupon:

```json
{"code":"reward-example","milestone":5,"discountPercent":10,"redeemedByOrderId":null}
```

After redemption, `redeemedByOrderId` contains the committed order ID. Milestone counts successful orders globally, not per customer. Coupons have no owner, expiry or stacking. Every eligible milestone can produce one coupon, including when earlier coupons remain unused. Generation is explicit and returns the oldest unrewarded milestone, one per request.

## Endpoints

All endpoints may return the common parsing/validation errors below.

| Method / path | Request | Success | Important domain errors |
| --- | --- | --- | --- |
| `GET /health` | No body | 200 `{"status":"ok"}` | None |
| `GET /config` | No body | 200 `{"rewardEvery":5,"discountPercent":10,"currency":"USD"}` | None |
| `GET /products` | No body | 200 array of Product | None |
| `POST /carts` | Optional empty object | 201 empty Cart; `Location: /carts/{id}` | None |
| `GET /carts/{cartId}` | No body | 200 Cart | 404 `CART_NOT_FOUND` |
| `POST /carts/{cartId}/items` | `{"productId":"pen","quantity":2}`; adds to existing quantity | 200 updated Cart | 404 `CART_NOT_FOUND`, `PRODUCT_NOT_FOUND`; 409 `CART_CLOSED`, `CART_LIMIT`; 400 if accumulated quantity exceeds 10000 |
| `PUT /carts/{cartId}/items/{productId}` | `{"quantity":3}`; replaces existing quantity | 200 updated Cart | 404 `CART_NOT_FOUND`, `ITEM_NOT_FOUND`; 409 `CART_CLOSED` |
| `DELETE /carts/{cartId}/items/{productId}` | Optional empty object; use DELETE rather than quantity zero | 200 updated Cart | 404 `CART_NOT_FOUND`, `ITEM_NOT_FOUND`; 409 `CART_CLOSED` |
| `POST /carts/{cartId}/checkout` | Required `Idempotency-Key` header; optional body `{"couponCode":"reward-example"}` | 201 new Order or 200 replayed Order; `Location: /orders/{id}`, `Idempotency-Replayed: false` or `true` | 404 `CART_NOT_FOUND`, `COUPON_NOT_FOUND`; 409 `EMPTY_CART`, `CART_CLOSED`, `INSUFFICIENT_STOCK`, `COUPON_REDEEMED`, `IDEMPOTENCY_CONFLICT`, `CAPACITY_EXCEEDED` |
| `GET /orders/{orderId}` | No body | 200 immutable Order | 404 `ORDER_NOT_FOUND` |
| `GET /orders` | No body | 200 array of immutable Orders | None |
| `PATCH /admin/products/{productId}` | Nonempty subset of `{"name":"Comet Pen v2","unitPriceCents":109,"available":40}` | 200 updated Product | 404 `PRODUCT_NOT_FOUND` |
| `POST /admin/coupons` | Optional empty object | 201 Coupon | 409 `NO_ELIGIBLE_MILESTONE` |
| `GET /admin/coupons` | No body | 200 array of Coupon | None |
| `GET /admin/report` | No body | 200 Report below | None |

Product updates set **absolute** available stock; this is a demo admin correction/restock operation, not an inventory movement ledger. Product names must contain 1–120 non-whitespace characters (surrounding whitespace trimmed), price and available stock are integers 0–1000000000. Product IDs cannot change; catalog creation/deletion is out of scope.

## Checkout retry contract

The key is global to this process, not scoped to a cart. Its request identity is the pair `(cartId, couponCode or null)`. JSON formatting, omitted optional body and `{}` do not affect the identity. A successful retry returns the original order even if product prices or stock subsequently changed. Reusing a successful key with another cart or coupon returns `IDEMPOTENCY_CONFLICT`. A different key for an already checked-out cart returns `CART_CLOSED`.

Only successful checkouts reserve keys. A failed request can be retried with the same key after fixing its cart, stock or coupon. Requests that fail are not cached; their retry can use current state. Keys never expire within the process. Restart loses all retry records along with all other data. Concurrent requests are serialized by non-yielding staged transactions; response completion order need not equal commit order.

The service treats committing the order as payment success. There is no charge to an external provider, simulated network delay, or charge endpoint.

## Reporting and reconciliation

```json
{
  "currency":"USD","totalOrders":1,
  "purchasedQuantityByProduct":{"pen":2},
  "grossRevenueCents":210,"totalDiscountsCents":21,"netRevenueCents":189,
  "coupons":{"generated":1,"available":0,"redeemed":1}
}
```

Sum `subtotalCents`, `discountCents` and `totalCents` over `GET /orders` to obtain gross, discounts and net. Sum order item quantities grouped by `productId` for purchased quantities (unsold products are omitted). Count `/admin/coupons`, separating null/non-null `redeemedByOrderId`, for generated/available/redeemed. `totalOrders` is the order array length. Each individual report is a consistent snapshot and never generates coupons or changes state. For cross-endpoint reconciliation, read while writes are quiescent; separately timed reads are not a shared snapshot.

## Errors

Domain error example:

```json
{"error":{"code":"INSUFFICIENT_STOCK","message":"Product no longer has enough stock","details":{"productId":"limited-print","requested":2,"available":1}}}
```

Other domain errors have stable `code` and a readable `message`; optional `details` are not present when unnecessary. When multiple conditions fail, the first validation/state check determines the error; clients should use `code`, not message text.

| Status | Code | Meaning / action |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid path/header/body/query or numeric bound. `details` is an array of `{path,message}`; fix the request. |
| 400 | `MALFORMED_REQUEST` | JSON or request parsing failed. |
| 404 | Resource codes in endpoint table | Resource/item/coupon does not exist. |
| 404 | `ROUTE_NOT_FOUND` | Unknown route. |
| 409 | Domain codes in endpoint table | State conflict; inspect code and current state. Stock failure and failed checkout consume nothing. |
| 409 | `CAPACITY_EXCEEDED` | A committed report amount or purchased quantity would exceed `Number.MAX_SAFE_INTEGER`; checkout is rolled back. |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeds 16384 bytes. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Use JSON for supplied bodies. |
| 500 | `INTERNAL_ERROR` | Sanitized unexpected failure. No stack trace; staged changes are discarded. Retry the same checkout identity/key. |

Example validation response:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Request validation failed","details":[{"path":"quantity","message":"Too small: expected number to be >=1"}]}}
```

Exact validation message wording belongs to the validator and is not a stable contract. Administrative generation requests are not keyed: competing calls can each generate different eligible milestones, but never duplicate the same milestone.
