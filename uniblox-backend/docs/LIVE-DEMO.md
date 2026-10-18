# Uniblox: final tests and live API demonstration

Executed: 2026-10-18T11:30:03.444802+00:00 to 2026-10-18T11:30:10.929518+00:00.
Source commit: `f72cf07033dd5b88521f8a76697515e07c7e7753`. Working tree clean before and after.

All evidence below was captured from actual commands and a real loopback HTTP server in the cloud workspace. Responses were not manufactured. Only fictional seeded products were used. No public deployment, real payment, credentials or customer records were involved.

## Results

**25 tests passed, 0 failed.** ESLint, strict TypeScript checks, build and the concurrency smoke test all exited 0.

| Demo observation | Actual result |
| --- | --- |
| First checkout | HTTP 201; total 210 USD cents |
| Same-key replay | HTTP 200; same order; `Idempotency-Replayed: true` |
| Pen stock | 100 before, 98 afterward |
| Orders | Exactly 1 |
| Report | 2 pens; gross 210, discount 0, net 210 cents |
| Repeat report | Identical response |
| Shutdown | Exit code 0 |

## Assertions checked during this run

- PASS: first checkout returned HTTP 201; same-key replay returned HTTP 200, Idempotency-Replayed: true, and exactly the same order JSON.
- PASS: Comet Pen stock changed from 100 to 98, with no second deduction on replay.
- PASS: exactly 1 order; purchased pen quantity 2; gross/net 210 cents; discounts 0; repeated reports are identical.
- PASS: retrieved order equals both checkout responses; order listing contains exactly that one order.
- PASS: the cloud-local server shut down gracefully with exit code 0; no public deployment was created.

## Complete command and response evidence

Commands ran from `/workspace/uniblox-work/uniblox-backend`. The temporary port and UUIDs below are the actual values from this run. HTTP responses retain the captured headers and JSON. Empty stdout/stderr is recorded explicitly. The server start entry was completed after graceful shutdown.

### Final source commit

```sh
git rev-parse HEAD
```

Exit code: **0**

stdout:
```text
f72cf07033dd5b88521f8a76697515e07c7e7753
```

stderr:
```text
(empty)
```

### Source working tree before verification

```sh
git status --porcelain
```

Exit code: **0**

stdout:
```text
(empty)
```

stderr:
```text
(empty)
```

### Node version

```sh
node --version
```

Exit code: **0**

stdout:
```text
v24.19.0
```

stderr:
```text
(empty)
```

### npm version

```sh
npm --version
```

Exit code: **0**

stdout:
```text
11.9.0
```

stderr:
```text
(empty)
```

### Lint, strict types, all tests and build

```sh
npm run check
```

Exit code: **0**

stdout:
```text

> uniblox-checkout-assignment@1.0.0 check
> npm run lint && npm run typecheck && npm test && npm run build


> uniblox-checkout-assignment@1.0.0 lint
> eslint . --max-warnings 0


> uniblox-checkout-assignment@1.0.0 typecheck
> tsc --noEmit


> uniblox-checkout-assignment@1.0.0 test
> tsx --test test/*.test.ts

✔ HTTP cart lifecycle, admin price changes, snapshots, and retrieval (107.545016ms)
✔ 20 overlapping scarce-stock checkouts commit exactly one sale (21.508747ms)
✔ 20 concurrent retries share the same order and only one stock deduction (9.586122ms)
✔ different keys competing for one cart cannot create multiple orders (8.176394ms)
✔ one globally scoped idempotency key cannot check out two carts (5.760669ms)
✔ competing coupon checkouts redeem once and leave the losing cart/stock intact (13.149095ms)
✔ overlapping admin requests generate each eligible milestone once; report reads do not generate (14.11276ms)
✔ overlapping adds accumulate; cart edits cannot race past checkout (5.920756ms)
✔ 500 during staged checkout is sanitized, rolls back, and permits same-key recovery (6.35525ms)
✔ strict validation rejects malformed input without changing carts or stock (9.462274ms)
✔ resource and state failures have distinguishable stable error codes (5.337861ms)
✔ public configuration has deterministic defaults and strictly bounded overrides (6.761828ms)
✔ validates configuration, products and quantities before changing state (6.26098ms)
✔ checkout uses live price/stock, snapshots its order and detaches returned objects (1.55931ms)
✔ idempotent retries return one snapshot; reused keys and new keys cannot duplicate orders (1.3238ms)
✔ failed checkout preserves all inventory, coupon and cart; the same key can retry (13.828986ms)
✔ unexpected late failure rolls back staged deductions, coupon use, order and retry key (0.845108ms)
✔ milestones are global, generated once, oldest first, only after successful orders (1.094062ms)
✔ rounds once on the subtotal, half up; 100% discounts never make totals negative (0.617898ms)
✔ invalid and redeemed coupons reject without consuming stock or closing the cart (0.489668ms)
✔ reports reconcile with returned orders/coupons and remain read-only and detached (0.57894ms)
✔ rejects unsafe prices and quantities, and adds exact integer totals at supported limits (0.718884ms)
✔ a reentrant clock cannot publish a nested transaction that the outer checkout overwrites (0.451097ms)
✔ aggregate safe-integer capacity failures roll back the entire attempted order (578.206174ms)
✔ stock changes after adding are checked at checkout; additive quantity overflow rolls back (0.642847ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 832.218222

> uniblox-checkout-assignment@1.0.0 build
> tsc -p tsconfig.build.json
```

stderr:
```text
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
```

### Existing real HTTP concurrency smoke test

```sh
npm run smoke
```

Exit code: **0**

stdout:
```text

> uniblox-checkout-assignment@1.0.0 smoke
> node scripts/smoke.mjs

PASS: compiled CLI, fictional seed, HTTP retries, coupon rollback/recovery, 20 competing checkouts, reconciled read-only report
```

stderr:
```text
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
```

### Start fresh compiled service for visible demo

```sh
/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node dist/server.js
```

Public configuration passed to the server (its complete child environment):
```json
{
  "HOST": "127.0.0.1",
  "PORT": "0",
  "REWARD_EVERY": "5",
  "DISCOUNT_PERCENT": "10"
}
```

Exit code: **0**

stdout:
```text
Checkout service listening at http://127.0.0.1:34425
```

stderr:
```text
(empty)
```

### 1. List the five fictional seeded products

```sh
curl --silent --show-error --max-time 10 --include --request GET http://127.0.0.1:34425/products --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 381
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

[{"id":"notebook","name":"Nebula Notebook","unitPriceCents":1299,"available":50},{"id":"pen","name":"Comet Pen","unitPriceCents":105,"available":100},{"id":"mug","name":"Orbit Mug","unitPriceCents":1895,"available":20},{"id":"tote","name":"Lunar Tote","unitPriceCents":2499,"available":15},{"id":"limited-print","name":"Stardust Limited Print","unitPriceCents":4999,"available":1}]
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 2. Create an empty cart

```sh
curl --silent --show-error --max-time 10 --include --request POST http://127.0.0.1:34425/carts --header 'Content-Type: application/json' --data-raw '{}' --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 201 Created
location: /carts/57555f32-4b07-42d7-b02f-f1fe54fab4ce
content-type: application/json; charset=utf-8
content-length: 122
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"id":"57555f32-4b07-42d7-b02f-f1fe54fab4ce","status":"open","orderId":null,"currency":"USD","items":[],"subtotalCents":0}
HTTP_STATUS:201
```

stderr:
```text
(empty)
```

### 3. Add two fictional Comet Pens

```sh
curl --silent --show-error --max-time 10 --include --request POST http://127.0.0.1:34425/carts/57555f32-4b07-42d7-b02f-f1fe54fab4ce/items --header 'Content-Type: application/json' --data-raw '{"productId":"pen","quantity":2}' --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 240
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"id":"57555f32-4b07-42d7-b02f-f1fe54fab4ce","status":"open","orderId":null,"currency":"USD","items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210,"available":100}],"subtotalCents":210}
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 4. First checkout: creates an order

```sh
curl --silent --show-error --max-time 10 --include --request POST http://127.0.0.1:34425/carts/57555f32-4b07-42d7-b02f-f1fe54fab4ce/checkout --header 'Content-Type: application/json' --data-raw '{}' --header 'Idempotency-Key: visible-demo-001' --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 201 Created
location: /orders/ef077e7f-7c40-451f-88db-276be58e5872
idempotency-replayed: false
content-type: application/json; charset=utf-8
content-length: 352
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"id":"ef077e7f-7c40-451f-88db-276be58e5872","cartId":"57555f32-4b07-42d7-b02f-f1fe54fab4ce","currency":"USD","items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210}],"subtotalCents":210,"discountPercent":0,"discountCents":0,"totalCents":210,"couponCode":null,"placedAt":"2026-10-18T11:30:10.872Z"}
HTTP_STATUS:201
```

stderr:
```text
(empty)
```

### 5. Replay the identical idempotency key

```sh
curl --silent --show-error --max-time 10 --include --request POST http://127.0.0.1:34425/carts/57555f32-4b07-42d7-b02f-f1fe54fab4ce/checkout --header 'Content-Type: application/json' --data-raw '{}' --header 'Idempotency-Key: visible-demo-001' --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
location: /orders/ef077e7f-7c40-451f-88db-276be58e5872
idempotency-replayed: true
content-type: application/json; charset=utf-8
content-length: 352
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"id":"ef077e7f-7c40-451f-88db-276be58e5872","cartId":"57555f32-4b07-42d7-b02f-f1fe54fab4ce","currency":"USD","items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210}],"subtotalCents":210,"discountPercent":0,"discountCents":0,"totalCents":210,"couponCode":null,"placedAt":"2026-10-18T11:30:10.872Z"}
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 6. Retrieve the committed immutable order

```sh
curl --silent --show-error --max-time 10 --include --request GET http://127.0.0.1:34425/orders/ef077e7f-7c40-451f-88db-276be58e5872 --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 352
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"id":"ef077e7f-7c40-451f-88db-276be58e5872","cartId":"57555f32-4b07-42d7-b02f-f1fe54fab4ce","currency":"USD","items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210}],"subtotalCents":210,"discountPercent":0,"discountCents":0,"totalCents":210,"couponCode":null,"placedAt":"2026-10-18T11:30:10.872Z"}
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 7. Inspect inventory after checkout and replay

```sh
curl --silent --show-error --max-time 10 --include --request GET http://127.0.0.1:34425/products --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 380
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

[{"id":"notebook","name":"Nebula Notebook","unitPriceCents":1299,"available":50},{"id":"pen","name":"Comet Pen","unitPriceCents":105,"available":98},{"id":"mug","name":"Orbit Mug","unitPriceCents":1895,"available":20},{"id":"tote","name":"Lunar Tote","unitPriceCents":2499,"available":15},{"id":"limited-print","name":"Stardust Limited Print","unitPriceCents":4999,"available":1}]
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 8. List all orders: exactly one exists

```sh
curl --silent --show-error --max-time 10 --include --request GET http://127.0.0.1:34425/orders --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 354
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

[{"id":"ef077e7f-7c40-451f-88db-276be58e5872","cartId":"57555f32-4b07-42d7-b02f-f1fe54fab4ce","currency":"USD","items":[{"productId":"pen","productName":"Comet Pen","unitPriceCents":105,"quantity":2,"lineTotalCents":210}],"subtotalCents":210,"discountPercent":0,"discountCents":0,"totalCents":210,"couponCode":null,"placedAt":"2026-10-18T11:30:10.872Z"}]
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 9. Inspect reconciled reporting

```sh
curl --silent --show-error --max-time 10 --include --request GET http://127.0.0.1:34425/admin/report --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 196
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"currency":"USD","totalOrders":1,"purchasedQuantityByProduct":{"pen":2},"grossRevenueCents":210,"totalDiscountsCents":0,"netRevenueCents":210,"coupons":{"generated":0,"available":0,"redeemed":0}}
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### 10. Repeat reporting to verify it stays read-only

```sh
curl --silent --show-error --max-time 10 --include --request GET http://127.0.0.1:34425/admin/report --write-out '
HTTP_STATUS:%{http_code}
'
```

Exit code: **0**

stdout:
```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 196
Date: Sun, 18 Oct 2026 11:30:10 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"currency":"USD","totalOrders":1,"purchasedQuantityByProduct":{"pen":2},"grossRevenueCents":210,"totalDiscountsCents":0,"netRevenueCents":210,"coupons":{"generated":0,"available":0,"redeemed":0}}
HTTP_STATUS:200
```

stderr:
```text
(empty)
```

### Source working tree after verification

```sh
git status --porcelain
```

Exit code: **0**

stdout:
```text
(empty)
```

stderr:
```text
(empty)
```

## Review and limits

The automated suite includes competing inventory and coupon checkouts, successful retry replay, same-cart checkout with different keys, global-key conflicts, milestone uniqueness, stock/coupon rollback and a late injected checkout exception. A separate AI review previously reproduced and corrected a reentrant clock callback that could overwrite a nested transaction; the regression test passes in the captured suite. This is not a claim of human review.

The service remains deliberately single-process and in-memory. Restart discards its state. Authentication and real payments are out of scope. This evidence document is separate from the source archive; the final source commit was not modified.

## Same-repository proof

The assignment uses a linked worktree of the existing nimbus repository; it is not a separate Git repository. No remote push was performed. The following commands were executed after the demo.

```sh
git -C /workspace/nimbus rev-parse --git-common-dir
```

Exit code: **0**

```text
.git
```

```sh
git -C /workspace/uniblox-work rev-parse --git-common-dir
```

Exit code: **0**

```text
/workspace/nimbus/.git
```

```sh
git -C /workspace/nimbus branch --list assignment/uniblox-backend
```

Exit code: **0**

```text
+ assignment/uniblox-backend
```

```sh
git -C /workspace/nimbus log assignment/uniblox-backend --oneline -5 -- uniblox-backend
```

Exit code: **0**

```text
f72cf07 docs: document API, trade-offs, AI ownership and clean verification
c5e1e9c fix: prevent nested state publication and verify numeric rollback limits
6a5d913 feat: expose validated HTTP API and verify competing requests
5160d06 feat: implement atomic checkout, milestone rewards and reconciled reports
fe30dcb test: define checkout invariants and isolated assignment setup
```

Both Git common directories resolve to `/workspace/nimbus/.git`. This evidence was captured against runtime source commit `f72cf07033dd5b88521f8a76697515e07c7e7753`; the report itself is committed afterward on the same branch, without changing runtime source.
