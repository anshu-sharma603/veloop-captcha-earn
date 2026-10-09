# Final Challenge: 100,000 CAPTCHA attempts per day

**Load check first.** 100 000 / 86 400 s ≈ **1.2 attempts/s** on average; with a 10× peak, ~12–15/s. Each attempt is ~4 requests (`current`, `verify`, `claim`, `new`) and 3–6 small writes. That is comfortably inside one MongoDB replica set (M10–M30) and 2–3 stateless API instances. The design goal is therefore **correctness under concurrency and abuse first**, and horizontal headroom second. Don't add Kafka-sized machinery for 1 req/s.

## Correctness (already in the design, keep it)
* **Atomic updates**: `ACTIVE → COMPLETED` and `PENDING → CLAIMED` are compare-and-set `findOneAndUpdate`s. Whoever flips the state wins; everyone else is rejected. No read-then-write.
* **Transactions**: verify (flip + attempt row) and claim (flip + `$inc` wallet + ledger row) run in a multi-document transaction on a replica set. Keep them short (3 writes) to avoid write conflicts.
* **Idempotency**: the natural idempotency key is `challengeId`. Unique indexes make it physical: `captchaattempts.challengeId`, `gemtransactions (type, referenceId)`. For client-visible idempotency add an `Idempotency-Key` header on claim and return the stored response on retry.
* **Expiry**: server clock only (`expiresAt`). Sweep lazily on read (as now); add a TTL index on `auditlogs` and an archival job (move `COMPLETED` challenges older than 90 days to cold storage / a separate collection).

## MongoDB indexes
Already defined: `challengeId` unique; partial-unique `{userId}` where `ACTIVE`; `{userId, createdAt}`; `{userId, status, rewardStatus, completedAt}`; ledger `{type, referenceId}` unique and `{userId, createdAt}`. Add `{status, expiresAt}` (partial on `ACTIVE`) for a background expiry sweeper and `{rewardStatus, claimableUntil}` (partial on `PENDING`). Run `explain()` on the three hot queries and keep every one covered by an index; avoid unbounded `skip` for history (switch to cursor pagination on `completedAt`).

## Rate limiting and abuse
* **Redis-backed** limiter (`rate-limit-redis`) so limits hold across instances. Layers: edge/WAF (Cloudflare) per IP → API per user and per IP → per-user daily caps (`MAX_DAILY_CHALLENGES`).
* **Cheap pre-checks in Redis** before touching MongoDB: a short-TTL key `captcha:active:{userId}` (challengeId + expiry) rejects obviously invalid/expired verifies without a DB read; `SET NX` on `claim:{challengeId}` is a fast duplicate-claim gate in front of the authoritative DB check (Redis is an optimisation, **MongoDB stays the source of truth**).
* Progressive penalties: repeated `INVALID_ATTEMPT`/`CROSS_USER_ACCESS` → temporary block, then manual review.

## Fraud / risk signals
Per user/device/IP: solve-time distribution (humans cannot answer in < 300 ms consistently), accuracy far above chance with perfectly regular timing, many accounts per IP/device fingerprint, rapid claim after verify across many sessions, new-account earning velocity, geo/ASN anomalies (datacenter ranges), repeated `SUSPICIOUS_REQUEST`. Feed these into a risk score; above a threshold → step-up (real CAPTCHA/Turnstile), reduced rewards, or reward hold. Store `ip`/`userAgent` on attempts (already done) and add `solveTimeMs` (server-measured: `completedAt − createdAt`).

## Queue architecture
Keep the money path **synchronous and transactional**: a user must see the right balance right after claiming. Move everything non-critical to a queue (BullMQ on Redis, or SQS): audit-log writes, analytics events, risk-score computation, notification emails, history aggregation. If audit volume grows, write audit events to the queue and batch-insert.

## API scaling
Stateless Node processes behind a load balancer (Render/Railway autoscaling or ECS), JWT auth needs no sticky sessions. `trust proxy` is already set. Run ≥ 2 instances, `cluster`/PM2 per core, 10–30 s graceful shutdown, readiness probe on `/api/health`. Cache `GET /captcha/config` (reward config) in memory for 30–60 s. Gzip + keep-alive. Frontend is static on a CDN.

## Database scaling
1. Start: M10/M20 replica set (3 nodes), `w: "majority"`, `readConcern: "majority"` inside transactions, read secondaries only for history/analytics (`readPreference: secondaryPreferred`).
2. Grow vertically, then **shard `captchachallenges`, `captchaattempts`, `gemtransactions` by hashed `userId`** (all hot queries are per-user, and the wallet doc is also per-user, so a user's transaction stays on one shard; a transaction never needs to span users).
3. Archive old challenges; keep the ledger forever (append-only).

## Monitoring
Metrics: request rate/latency/error by route, 429 rate, verify success vs wrong ratio, claim conversion, transaction retries/`WriteConflict` count, Mongo replication lag and connection pool, queue depth, Redis latency. Alerts: **wallet reconciliation mismatch**, spike in `DUPLICATE_ATTEMPT`/`SUSPICIOUS_REQUEST`, rewards per hour above baseline, p99 verify latency, 5xx > 1 %. Structured JSON logs with `requestId`, `userId`, `challengeId`; traces (OpenTelemetry). Dashboards: Grafana/Atlas Charts.

## Reward reconciliation
Invariants checked nightly (and after incidents) by a job:
1. For each user: `wallet.balanceMilli == Σ gemtransactions.amountMilli` (SEED_BONUS included).
2. For each ledger row: `balanceAfter − balanceBefore == amount`, and the chain per user is consistent in `createdAt` order.
3. Every `CLAIMED` challenge has **exactly one** `CAPTCHA_REWARD` ledger row, and vice-versa (no orphan rows, no `CLAIMED` without a row).
4. `Σ rewardAmountMilli` for `CLAIMED` in a day == Σ ledger credits for the same day.
Mismatches page on-call; the ledger is the evidence, and corrections are made by **new compensating ledger rows**, never by editing history. Because this design also compensates manually on non-transactional deployments, this job is the safety net for any partial failure.
