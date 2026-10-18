# Uniblox checkout and rewards backend

Standalone TypeScript / Node.js service for the [public assignment](https://github.com/neustackapp/assignment/tree/main/be). It implements carts, transactional checkout, inventory, single-use milestone coupons and reconciled reporting. All five seeded products are fictional. No accounts, secrets, private services or payment integration are required.

## Run

Use Node.js **22.13+** (verified on Node 24.19.0) and npm. From the `uniblox-backend` directory:

```sh
npm ci
npm run check
npm run smoke
npm start
```

`check` runs ESLint, strict TypeScript checks, all automated tests and compilation. `smoke` launches the compiled CLI on a temporary loopback port, exercises real HTTP requests including concurrent checkout and coupon recovery, then gracefully stops it. `npm start` listens on `http://127.0.0.1:3000` by default. Use Ctrl-C to stop. `npm run dev` runs the TypeScript entry point with automatic restart.

In this cloud sandbox, npm's default home cache is not writable. Use `npm ci --cache /tmp/uniblox-npm-cache` here. No global installs are needed.

Configuration is optional and contains only public demo settings:

| Setting | Default | Allowed |
| --- | --- | --- |
| `PORT` | `3000` | Integer 0–65535; 0 chooses a temporary port |
| `HOST` | `127.0.0.1` | `127.0.0.1`, `::1`, `0.0.0.0` |
| `REWARD_EVERY` | `5` | Integer 1–1000000 |
| `DISCOUNT_PERCENT` | `10` | Integer 1–100 |

```sh
REWARD_EVERY=2 DISCOUNT_PERCENT=10 PORT=3001 npm start
```

Each start seeds a fresh in-memory store:

| Product ID | Fictional name | Unit cents (USD) | Stock |
| --- | --- | ---: | ---: |
| `notebook` | Nebula Notebook | 1299 | 50 |
| `pen` | Comet Pen | 105 | 100 |
| `mug` | Orbit Mug | 1895 | 20 |
| `tote` | Lunar Tote | 2499 | 15 |
| `limited-print` | Stardust Limited Print | 4999 | 1 |

## Evaluate

See [API documentation](docs/API.md) for every endpoint, payload, response and error. A minimal checkout, replacing `CART_ID` with the fictional cart ID from the first response:

```sh
curl -sS -X POST http://127.0.0.1:3000/carts
curl -sS -X POST http://127.0.0.1:3000/carts/CART_ID/items \
  -H 'Content-Type: application/json' \
  -d '{"productId":"pen","quantity":2}'
curl -sS -X POST http://127.0.0.1:3000/carts/CART_ID/checkout \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-order-1' -d '{}'
curl -sS http://127.0.0.1:3000/admin/report
```

Repeat the identical checkout with the same key to retrieve its original order (200, no further stock change). A new key for that closed cart returns 409. After the fifth successful order under the default configuration, `POST /admin/coupons` generates the first coupon; use its `code` in the next checkout's `couponCode` field. `scripts/smoke.mjs` is a complete, runnable HTTP example without manual IDs.

## Correctness and boundaries

`Store.#transaction` stages all changes in a private copy and publishes once. It never yields to another request. Checkout couples inventory deductions, immutable order snapshots, coupon redemption, cart closure and the successful idempotency record. Any exception before publication discards the candidate state. A guard also rejects reentrant mutations from the injected clock.

This guarantees request overlap safety **within one Node.js process and one Store**. It does not provide durable storage or distributed coordination. Restart loses carts, orders, coupons and idempotency history; multiple processes would have independent stores and must not be used to serve one shop. State cloning, reporting and list responses are intentionally unbounded in history size and unsuitable for production scale. No authentication is implemented; `/admin/*` is administrative. Default listening is loopback only.

See [DECISIONS.md](DECISIONS.md) for trade-offs, money rules, ambiguities, production evolution and truthful AI assistance. [Verification](docs/VERIFICATION.md) records actual outcomes and review findings. [Design plan](docs/PLAN.md) records the implementation scope. Start a candidate walkthrough with `src/store.ts`, then `test/store.test.ts` and `test/api.test.ts`; the candidate must review and explain the solution before submitting it.

The existing WeatherX application and its configuration are untouched. This assignment runs independently of that monorepo. No push, public deployment or recruiter submission was performed.
