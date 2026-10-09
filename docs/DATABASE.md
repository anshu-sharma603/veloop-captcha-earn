# Database Design (MongoDB + Mongoose)

## Gems are integers
1 Gem = **1000 milli-gems**, stored as integers (`balanceMilli`, `amountMilli`, `rewardAmountMilli`). 0.5 Gem = `500`.  
Why: JavaScript/BSON doubles cannot represent every decimal exactly (`0.1 + 0.2 !== 0.3`). Integer `$inc` is exact, so 1000 wrong answers add exactly 500 000 milli-gems. Conversion to a human number happens only in `utils/money.js` at the API boundary.

## Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Accounts | `email` (unique), `passwordHash` (bcrypt, `select:false`), `isActive` |
| `wallets` | Authoritative balance | `userId` (unique), `balanceMilli` (≥ 0 integer), `lifetimeEarnedMilli` |
| `captchachallenges` | One row per challenge; also the attempt result | `challengeId` (unique), `userId`, `captchaText`\*, `options[4]`, `correctOption`\*, `status`, `expiresAt`, `selectedOption`, `result`, `rewardAmountMilli`, `rewardStatus`, `claimableUntil`, `completedAt`, `claimedAt` |
| `captchaattempts` | Audit-friendly record of each accepted verification | `attemptId`, `challengeId` (unique), `userId`, `selectedOption`, `result`, `rewardAmountMilli`, `ip`, `userAgent` |
| `gemtransactions` | Immutable ledger | `transactionId`, `userId`, `amountMilli`, `type`, `source`, `referenceId`, `balanceBeforeMilli`, `balanceAfterMilli`, `status` |
| `captcharewardconfigs` | Reward rules (DB-driven) | `correctRewardMilli`, `wrongRewardMilli`, `currency`, `active` |
| `auditlogs` | Security / business events | `event`, `userId`, `challengeId`, `ip`, `meta` |

\* `select: false` in the schema: a normal query cannot return them; code must opt in with `.select('+correctOption')`.

## State machines
```
status:        ACTIVE ──verify──▶ COMPLETED
                 ├──time──▶ EXPIRED
                 └──new / no-thanks──▶ DISCARDED         (terminal states are never left)

rewardStatus:  NONE ──verify──▶ PENDING ──claim──▶ CLAIMED
                                   ├──no-thanks / new──▶ DECLINED
                                   └──claim window passes──▶ EXPIRED
```

## Indexes (and what they enforce)

| Index | Guarantee |
|---|---|
| `captchachallenges {challengeId}` unique | ids are unique |
| `captchachallenges {userId}` unique, partial `status = ACTIVE` (`one_active_per_user`) | at most **one** live challenge per user, even under concurrent requests |
| `captchachallenges {userId, createdAt}` and `{userId, status, rewardStatus, completedAt}` | fast `current`, history and daily-cap queries |
| `captchaattempts {challengeId}` unique | at most one accepted attempt per challenge |
| `gemtransactions {type, referenceId}` unique | at most **one ledger row per challenge**, a database-level backstop against double rewards |
| `wallets {userId}` unique | one wallet per user |
| `auditlogs {event, createdAt}`, `{userId, createdAt}` | incident queries |

## Reward lifecycle (what to look at in Atlas / Compass)
1. `GET /captcha/current` → new `captchachallenges` doc (`ACTIVE`).
2. `POST /verify` → same doc `COMPLETED`, `result`, `rewardStatus: PENDING`; new `captchaattempts` doc; `auditlogs`: `CHALLENGE_VERIFIED`, `REWARD_CREATED`.
3. `POST /claim` → `rewardStatus: CLAIMED`; `wallets.balanceMilli += reward`; new `gemtransactions` doc with before/after; `auditlogs`: `REWARD_CLAIMED`.

## Atomicity
* Replica set / Atlas (auto-detected on connect): `verify` and `claim` run inside `session.withTransaction()`, so state flip + attempt row (verify) or flag flip + wallet credit + ledger row (claim) commit together or not at all.
* Standalone MongoDB (local dev): every state change is still a single-document compare-and-set (`findOneAndUpdate` with the expected status in the filter); the claim path compensates manually if a later step fails. Console prints `transactions: ON/OFF` at startup.
