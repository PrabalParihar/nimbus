# Decisions and ownership

Built for the [public brief](https://github.com/neustackapp/assignment/tree/main/be), read on 2026-10-18. This is a deliberately small backend, with no frontend, authentication, private data or real payments. The intended assignment timebox is at most 4–6 hours; actual AI session time and commands are recorded in `docs/VERIFICATION.md`, not represented as candidate-authored work or hours of human review.

## Invariants

1. Available inventory never becomes negative through checkout. Every committed order deducts exactly its purchased quantities once.
2. A cart has at most one order and cannot be edited after checkout.
3. One successful retry identity returns one immutable order. A successful key cannot identify another request.
4. A coupon redeems for at most one order, and redemption, stock deductions, order creation, cart closure and retry storage commit together or not at all.
5. Only successful orders count toward global milestones. Each milestone can generate at most one coupon, regardless of competing admin requests.
6. Order lines retain purchased names, prices, quantities and totals; current product changes cannot rewrite history.
7. Money and report quantities are exact safe integers; net equals gross minus discounts, with nonnegative totals.
8. Reports derive from committed orders/coupons and never change state. Returned objects cannot mutate private state.

## Decision: synchronous staged transactions in one process

**Context:** Request overlap can otherwise duplicate sales, use a coupon twice or partially consume resources.

**Options considered:** SQL transactions with constraints; an explicit async mutex over mutable maps; synchronous in-memory mutation with rollback; staged state publication.

**Choice:** Each mutation clones the private state, runs synchronous validation/mutation, clones its result, then publishes one state pointer. No asynchronous work occurs inside the transaction. A guard rejects reentrant mutations; `finally` releases it even when an error occurs.

**Why:** Within one Node event loop, a callback without awaits cannot overlap another HTTP transaction. Staging also handles exceptions after deductions, without maintaining an inverse-operation rollback log. A mutex adds machinery without increasing safety for this synchronous store. The injected clock is synchronous infrastructure, not an external payment call.

**Consequences:** Only one process/Store can serve the shop. Restart loses everything. Cloning is O(total state) per mutation and blocks the event loop, so this is proportionate to a take-home demonstration, not a production architecture. A process crash loses the whole store rather than leaving recoverable records. External payments cannot simply be inserted into this callback.

## Decision: successful-only, global idempotency keys

**Context:** A checkout response can be lost, and clients can also submit different keys for one cart.

**Options considered:** Cart-only deduplication; globally scoped keys; per-cart keys; cache every response including failures; expire keys.

**Choice:** Require a key, store the request identity `(cartId, couponCode or null)` and resulting order ID in the same commit. Replay succeeds before cart/coupon validity checks, returning the original snapshot. Different request identity with a used key conflicts. A cart closure constraint independently blocks another key. Failed requests reserve nothing.

**Why:** Retrying after a failure can use repaired inventory/cart state. Persisting only successes avoids poisoning a key with temporary stock failures. Keeping keys indefinitely within the process preserves the guarantee without expiry edge cases.

**Consequences:** Keys consume memory and cannot be shared across service instances or survive restart. With future authentication, scope keys to the customer/tenant, so one client cannot collide with another client's namespace. A real payment provider needs its own correlated idempotency key.

## Decision: checkout uses live prices and availability

**Context:** Carts can be stale between editing and checkout.

**Options considered:** Reserve inventory and prices at add time; reject changed quotes using a version; reprice at checkout.

**Choice:** Open carts show live prices and stock. They reserve nothing, and may contain more units than currently available. Checkout validates all lines against current inventory and current prices. Closed-cart views come from the order snapshot. Admin product patches atomically set absolute stock/name/price.

**Why:** Reservations require expiry and release machinery; quote-version confirmation would add another client flow. The chosen semantics are simple and explicit for a backend exercise.

**Consequences:** A displayed quote can change before checkout. A real customer-facing system should add quote versions/confirmation before charging. Admin stock correction is intentionally not an inventory audit ledger. Product creation/deletion and complex pricing are deferred.

## Decision: global milestones, explicit oldest-first coupon generation

**Context:** The brief does not specify per-user rewards, automatic issuance, backlog order, coupon ownership or expiry.

**Options considered:** Per-user order counters; automatic issuance on checkout; global milestones with explicit generation; only one outstanding coupon at a time.

**Choice:** Every global nth successful order unlocks a milestone. An admin call generates exactly one coupon for the oldest eligible unrewarded milestone. It can issue multiple backlog coupons over repeated calls even while others remain unused. Coupons are bearer codes, single use, no expiry, no stacking, and apply to the whole next order that supplies one. `n` is 1–1000000, integer `x` is 1–100 percent. Configuration is fixed for the store lifetime.

**Why:** There are no customers or authentication in scope, and the brief explicitly asks for administrator generation. A milestone set derived from committed coupons prevents duplicates. Reporting never issues rewards.

**Consequences:** The qualifying order cannot redeem its not-yet-generated reward. Coupons apply store-wide, not to a specific buyer. UUID codes avoid sequential guessability but are not authorization. Real customer rewards need ownership and expiry policy; configuration changes across durable state need explicit versioning.

Zero-price products and zero-total successful orders are allowed and still count toward milestones. Supplying a coupon to a successful zero-total order consumes it; there is no minimum spend. Failed checkouts never consume it.

## Decision: integer cents, exact intermediates and round half up

**Context:** Floating-point percentages and accumulated totals can drift, even with integer-looking inputs.

**Options considered:** Binary dollar floats; a decimal-money library; integer cents with BigInt intermediates.

**Choice:** USD only, integer cents on the wire. Compute line multiplication, summation and discount arithmetic with BigInt. Discount is `(subtotal * percent + 50) / 100`, using integer division, applied once at order level. Percent 1–100 ensures discount never exceeds subtotal. Convert to JSON numbers only after checking 0–`Number.MAX_SAFE_INTEGER`. Prices/stock are capped at 1e9; quantities at 10000, cart distinct lines at 100. Before checkout publication, derive the projected report and reject if aggregate money or quantities would become unsafe.

**Why:** No dependency or decimal representation is needed for one currency and whole percentages. BigInt avoids unsafe intermediate multiplication; the commit-time aggregate check keeps every future report exactly representable.

**Consequences:** Enormous stores eventually return `CAPACITY_EXCEEDED` with full rollback. Production could return money as decimal strings/decimal types and use SQL BIGINT or NUMERIC. Tax, shipping, multiple currencies, fractional percentages and per-line discount allocation are deferred.

## Decision: immutable historical snapshots and derived reporting

**Context:** Updating catalog data must not change what an order says was bought or break report reconciliation.

**Options considered:** Join orders to live catalog data; maintain mutable reporting counters; store snapshots and derive reports.

**Choice:** Snapshot product ID/name, quantity, unit/line price, subtotal, percentage, discount, net, currency, coupon code and timestamp. All public results are detached copies. Reports sum committed snapshots and count coupon records; unsold products are omitted from purchased quantities. Order and coupon list endpoints let an evaluator reconcile the report.

**Why:** Derived reports have one source of truth and no drift-prone second set of counters. Detached results prevent accidental mutation through direct domain callers as well as HTTP serialization.

**Consequences:** Reporting and list endpoints scan history and lack pagination. Separately timed endpoint reads can see different commits; reconcile while writes are quiescent. At scale, snapshot-consistent queries and materialized aggregates would need reconciliation/versioning.

## Decision: checkout commit represents payment success

**Context:** The brief permits no payment integration, or a fake if it supports the design.

**Options considered:** A fake asynchronous payment provider with compensation; no provider and atomic order success.

**Choice:** No payment abstraction. A committed checkout is payment success. Tests exercise expected stock/coupon failures and an unexpected clock exception after staged stock/coupon changes.

**Why:** An external-provider simulation would introduce states unrelated to the required local transaction without demonstrating actual provider guarantees. The late failure still proves rollback after resource changes rather than merely testing validation before writes.

**Consequences:** This does not solve distributed payment atomicity. Production requires a pending-order/reservation state machine, provider idempotency and durable inbox/outbox/reconciliation, avoiding a database transaction held open across network I/O.

## Decision: strict requests and stable error codes

**Context:** Invalid quantities, unknown fields and ambiguous retries should not silently enter state.

**Options considered:** Coerce strings to numbers and ignore extra fields; accept permissive JSON; strict typed boundary validation with domain checks.

**Choice:** Fastify for HTTP parsing and lifecycle, Zod strict schemas for bodies/path/header/query, repeated domain guards for state invariants. Distinguish 400 invalid requests, 404 missing resources, 409 state conflicts, 413 body limit, 415 media type, and sanitized 500 failures. Bound request bodies to 16 KiB. Every error has a stable code; internal stack traces and raw request data are not returned/logged by the app.

**Why:** Clients can decide whether to repair, fetch state or retry without matching prose. Domain invariants also hold for tests/direct callers, independent of the transport adapter.

**Consequences:** Validation message wording is not stable; clients use codes. Invalid syntax is checked before idempotent replay, so a malformed retry is still rejected. Authentication, rate limits, logging/metrics and browser CORS are intentionally deferred; `/admin/*` is clearly labeled and default bind is loopback.

## Production evolution and another two hours

Use one shared relational database with `orders.cart_id UNIQUE`, idempotency key/identity uniqueness scoped to tenant, `coupons.milestone UNIQUE`, and one redemption/order link per coupon. In one transaction, acquire cart, coupon and inventory row locks in deterministic product-ID order; revalidate stock, conditionally deduct stock, create order/lines, mark cart/coupon, and insert successful idempotency result. Database constraints and affected-row counts backstop application validation. Concurrent key/milestone uniqueness failures should read the committed winner or return a defined conflict, with retryable isolation/deadlock handling. Reports use read-only consistent snapshots.

First use the extra two hours for a SQLite/PostgreSQL persistence spike with crash/restart and multi-process invariant tests. Prioritize durable idempotency and constraints before query tuning or a frontend. Next add bounded/paginated listings, meaningful internal diagnostics/metrics and an inventory movement log. Only introduce real payments after documenting reservation expiry, provider timeouts and reconciliation behavior.

## AI assistance and candidate responsibility

Codex authored the implementation, tests and documentation in the cloud workspace. AI also read the public brief, designed alternatives, ran tools and performed a separate adversarial review pass. This is not a claim of independent human review or candidate-authored reasoning. No private transcripts, user credentials or customer records were used. Seed data is fictional.

A concrete correction to AI output: the first transaction implementation relied only on synchronous callbacks. Review found that the injected clock could initiate a nested mutation, whose successful state was then overwritten by the outer checkout. A new regression test failed with “Missing expected exception.” The implementation was changed to reject reentrant mutation and release its guard in `finally`; the test now confirms rollback and subsequent recovery of both carts/keys. Review also exercised aggregate safe-integer exhaustion rather than assuming individual integer prices made reports safe.

The candidate has not been observed reviewing or understanding this code. Before submission, they should personally trace the publication point, explain why an `await` would break the concurrency argument, predict two checkouts sharing a coupon, run the failure tests and modify a rule (for example per-customer rewards or quote-version validation). The candidate remains responsible for every submitted line. No push, recruiter message or public deployment was performed.
