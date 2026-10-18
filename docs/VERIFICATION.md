# Verification record

The checks below record the initial implementation and demo before the assignment moved to the repository root. Current verification after replacing the old application is in [ROOT-VERIFICATION.md](ROOT-VERIFICATION.md). Historical commands and paths below remain accurate for those earlier runs.

Executed in the selected cloud workspace on 2026-10-18. No local computer, external payment service, credentials, customer data, paid services or public deployment were used.

## Final checks

Runtime: Node.js `v24.19.0`, npm `11.9.0`.

| Check | Actual result |
| --- | --- |
| `npm run lint` | PASS, ESLint with zero warnings allowed |
| `npm run typecheck` | PASS, strict TypeScript, no emit |
| `npm test` | PASS, 25 tests, 0 failures, 0 skipped |
| `npm run build` | PASS, compiled Node ESM output |
| `npm run smoke` | PASS, spawned compiled server, real loopback HTTP, graceful exit 0 |
| Clean `npm ci` | PASS, 148 packages installed from the committed lockfile using an empty cache |
| Clean `npm run check && npm run smoke` | PASS, 25 tests and the complete CLI smoke flow |
| `git diff --check` | PASS |

Clean verification ran from `/tmp/uniblox-clean.LgeEJV/uniblox-backend`, copied without `node_modules` or `dist`, using:

```sh
npm ci --cache /tmp/uniblox-npm-clean-cache
npm run check
npm run smoke
```

The clean suite reported `tests 25`, `pass 25`, `fail 0`, `skipped 0` (about 1.05 seconds for tests). Smoke printed:

```text
PASS: compiled CLI, fictional seed, HTTP retries, coupon rollback/recovery, 20 competing checkouts, reconciled read-only report
```

The npm home cache is not writable in this sandbox; selecting `/tmp` resolved that setup issue without changing credentials or host configuration. npm printed an informational new-version notice. An initially selected deprecated ESLint major was replaced with the supported ESLint 10 release; Node minimum was aligned to its 22.13 requirement. The unrelated WeatherX application was not installed or tested.

## Review and failure evidence

A separate AI review pass checked transaction publication, retry identity, cart closure, coupon/milestone uniqueness, numeric boundaries, catalog changes, object aliasing and reporting reconciliation against the public brief. This was not an independent human review.

- Initial domain tests were observed failing against an unimplemented Store, then passed after implementation.
- The review added a reentrant-clock regression. It initially failed with `Missing expected exception`, exposing overwritten nested publication. A mutation guard with `finally` cleanup fixed it; rollback and subsequent retry now pass.
- A late clock exception after staged inventory/coupon/cart changes returns a sanitized HTTP 500 and leaves committed state unchanged. Retrying the same key succeeds.
- A multi-product stock failure leaves all inventory, coupon availability and cart status intact; repairing the cart and retrying the same key succeeds.
- Aggregate safe-integer exhaustion rejects an otherwise valid large checkout without partial publication. Individual safe prices are not assumed to imply safe lifetime totals.
- HTTP overlap tests cover 20 buyers for one unit, 20 same-key retries, different keys for one cart, one key for two carts, two coupon users, overlapping additive cart edits and competing milestone generation.
- Historical snapshots, response mutation, stock/price changes after cart creation, half-up rounding, 100% discounts, repeated reports and malformed requests are covered.
- The real-server smoke uses 10 concurrent retries and 20 concurrent stock checkouts. It also checks coupon failure/recovery, order/report reconciliation and shutdown. Each spawned server uses only four public demo settings in its environment.

## Time, ownership and delivery

Approximately 12 minutes of AI-assisted cloud execution through implementation, review and clean verification (starting around 11:14 UTC), plus final packaging. This is elapsed AI session work, not a claim of 4–6 hours of candidate work, human reasoning or human review. Commit authorship is explicitly Codex. The candidate must personally review, run and understand the code before submission; `DECISIONS.md` identifies a suggested walkthrough.

The assignment is now at the root of branch `assignment/uniblox-backend` in `/workspace/uniblox-work`, a linked worktree of the existing `/workspace/nimbus` repository. Both use `/workspace/nimbus/.git` as their shared Git directory. The former WeatherX application was removed on the assignment branch through recoverable tracked deletions; all earlier history remains. No push, PR, recruiter communication or public deployment occurred. Source and development history remain committed in the same repository.

A fresh `npm run check` and `npm run smoke` passed again at approximately 11:30 UTC on 2026-10-18. [LIVE-DEMO.md](LIVE-DEMO.md) records their actual output plus a separate real HTTP demonstration: a 201 checkout, identical 200 replay, inventory 100 to 98 and a one-order report for 210 cents. It also records same-repository proof. The fresh demo did not change runtime source.

Remaining limits are intentional: single process, volatile storage, no authentication, no real payment, linear state cloning/scans, unpaginated lists and no customer identities. There are no unresolved implementation or setup blockers.
