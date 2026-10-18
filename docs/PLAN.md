# Assignment design and execution plan

Source: https://github.com/neustackapp/assignment/tree/main/be (read 2026-10-18).
Scope: a standalone backend at the repository root. The former WeatherX application is removed through recoverable tracked deletions, with Git history preserved.

## Design

Fastify HTTP adapter -> synchronous Store domain -> private in-memory state.
Every mutation clones the committed state, validates and changes the candidate,
then publishes it in one assignment. No transaction callback, clock or ID source
may be asynchronous. Node's single event loop serializes these non-yielding
transactions. A failure before publication leaves the original state unchanged.
This is deliberately a single-process solution; there are no external payments.

Products, carts, orders, coupons and idempotency records share the transaction.
Checkout uses current prices and stock, snapshots purchased lines, and consumes
the cart and optional coupon together. Integer cents use BigInt intermediates,
round-half-up discounts, and safe-integer range checks. Every global nth order
unlocks one admin-generated coupon; generation chooses the earliest unrewarded
milestone. Reports derive totals from orders and coupon records without writes.

## Execution

1. Commit isolated setup, design and tests expressing checkout/reward invariants.
2. Implement domain: cart mutations; atomic checkout; idempotency; admin product
   changes; milestone coupons; immutable snapshots and reconciled reporting.
3. Add strict HTTP validation, stable errors and integration tests exercising
   concurrent requests, retries, conflicting keys and failure/rollback paths.
4. Document full API, decisions, setup, AI assistance and actual verification.
5. Review the final implementation separately; fix findings with regressions.
   Run lint, typecheck, all tests, clean install/build/live-server smoke. Keep
   source, actual development commits and fresh demo evidence at the repository
   root on the assignment branch in the existing nimbus repository; no remote push.

## Review focus

- One cart -> at most one order, regardless of idempotency key.
- A successful retry returns the original immutable result; failures reserve no key.
- Coupon, inventory and reward eligibility change only on committed operations.
- Concurrent checkouts cannot share scarce stock or a coupon.
- Price changes affect open carts but never historical orders or reports.
- Malformed, excessive and unsafe numeric input cannot enter committed state.

The delegated request authorizes completing implementation and verification in
this cloud workspace. No intermediate permission gates, pushes or deployment.
