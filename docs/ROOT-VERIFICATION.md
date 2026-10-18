# Verification after replacing the repository root

Executed in the cloud: 2026-10-18T12:09:12.383790+00:00 to 2026-10-18T12:09:21.351353+00:00.

The Uniblox assignment now occupies the root of the existing nimbus repository on `assignment/uniblox-backend`. The worktree is `/workspace/uniblox-work`; its Git common directory remains `/workspace/nimbus/.git`. This is the same repository and preserved history, not a new repository.

## Replacement and review

- The branch was clean before replacement; the original `/workspace/nimbus` checkout was also clean. No repository-specific AGENTS.md instructions were found.
- The former application was removed with Git-tracked deletions (88 old tracked paths selected, including the superseded root README/.gitignore and .DS_Store). Git history remains recoverable; the new assignment README/.gitignore replace those two root files.
- The assignment moved from `uniblox-backend/` to the root with Git moves. Existing task-generated node_modules/dist were relocated without overwriting any files, then a clean root npm ci was performed.
- All 15 runtime, test and configuration files were compared byte-for-byte against `d40fa88decfabb1c84b850d9a5878ee19b651cdd:uniblox-backend/`; they are unchanged. Only their paths and accompanying documentation changed.
- Retained assignment files were reviewed for accidental credentials/private-key patterns; no matches were found. Seed data is fictional. Deleted old-app contents were not read for credentials or private information.
- Historical LIVE-DEMO.md commands/outputs remain verbatim, clearly labeled as evidence captured before the move. Current setup commands run from the repository root.
- No push, deployment, recruiter contact or additional archive delivery was performed.

## Fresh results

| Check | Result |
| --- | --- |
| Clean root npm ci | PASS, exit 0 |
| ESLint | PASS, exit 0 |
| Strict TypeScript typecheck | PASS, exit 0 |
| Automated tests | 25 passed, 0 failed, 0 skipped |
| Build | PASS, exit 0 |
| Real HTTP smoke | PASS, exit 0 |
| Whitespace/diff check | PASS, exit 0 |

The smoke starts the compiled CLI on a cloud-local temporary loopback port, exercises seeded products, concurrent same-key retries, failed coupon checkout/recovery, 20 competing checkouts and reconciled reporting, then verifies graceful shutdown. It is an actual execution, not fabricated output.

## Captured commands and output

Working directory: `/workspace/uniblox-work` (repository root).

### npm ci --cache /tmp/uniblox-npm-cache

```sh
npm ci --cache /tmp/uniblox-npm-cache
```

Exit code: **0**

stdout:
```text

added 148 packages in 2s
```

stderr:
```text
(empty)
```

### npm run check

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

✔ HTTP cart lifecycle, admin price changes, snapshots, and retrieval (107.715687ms)
✔ 20 overlapping scarce-stock checkouts commit exactly one sale (19.824656ms)
✔ 20 concurrent retries share the same order and only one stock deduction (7.357434ms)
✔ different keys competing for one cart cannot create multiple orders (8.2358ms)
✔ one globally scoped idempotency key cannot check out two carts (4.892885ms)
✔ competing coupon checkouts redeem once and leave the losing cart/stock intact (12.663687ms)
✔ overlapping admin requests generate each eligible milestone once; report reads do not generate (11.91819ms)
✔ overlapping adds accumulate; cart edits cannot race past checkout (5.793685ms)
✔ 500 during staged checkout is sanitized, rolls back, and permits same-key recovery (4.82834ms)
✔ strict validation rejects malformed input without changing carts or stock (8.514592ms)
✔ resource and state failures have distinguishable stable error codes (4.739066ms)
✔ public configuration has deterministic defaults and strictly bounded overrides (7.088404ms)
✔ validates configuration, products and quantities before changing state (9.083268ms)
✔ checkout uses live price/stock, snapshots its order and detaches returned objects (3.593946ms)
✔ idempotent retries return one snapshot; reused keys and new keys cannot duplicate orders (1.868829ms)
✔ failed checkout preserves all inventory, coupon and cart; the same key can retry (9.062578ms)
✔ unexpected late failure rolls back staged deductions, coupon use, order and retry key (0.937451ms)
✔ milestones are global, generated once, oldest first, only after successful orders (0.960452ms)
✔ rounds once on the subtotal, half up; 100% discounts never make totals negative (0.49257ms)
✔ invalid and redeemed coupons reject without consuming stock or closing the cart (0.681765ms)
✔ reports reconcile with returned orders/coupons and remain read-only and detached (0.957845ms)
✔ rejects unsafe prices and quantities, and adds exact integer totals at supported limits (1.065238ms)
✔ a reentrant clock cannot publish a nested transaction that the outer checkout overwrites (0.840742ms)
✔ aggregate safe-integer capacity failures roll back the entire attempted order (599.39763ms)
✔ stock changes after adding are checked at checkout; additive quantity overflow rolls back (0.725912ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 897.86826

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

### npm run smoke

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

### git diff --check

```sh
git diff --check
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

## Limits

The implementation remains a single-process, in-memory service. Restart loses its state. Authentication, real payments, multi-instance operation and production-scale storage are intentionally deferred as explained in DECISIONS.md. The final root-replacement commit is the commit that adds this report; its exact SHA is reported separately to avoid self-referential commit metadata.
