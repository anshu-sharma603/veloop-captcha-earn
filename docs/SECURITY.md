# Security

> No system is "100% fraud-proof". This document lists what is protected, how, and what is *not* solved.

## Principle
The frontend only displays. It never holds the correct answer, a reward amount, a balance, or an eligibility decision. The browser sends two values (`challengeId`, `selectedOption`); the server derives everything else.

## Threats and mitigations

| Threat | Mitigation | Where |
|---|---|---|
| **Frontend reward manipulation** (`reward: 100000`, `isCorrect: true`, edited JS state, `localStorage`) | Rewards come from `CaptchaRewardConfig` in MongoDB via `calculateReward()`. Request bodies are parsed by zod, which **strips unknown keys**, so those fields never reach a service; attempts are logged as `SUSPICIOUS_REQUEST`. The wallet lives in MongoDB; `localStorage` only holds the JWT. | `middleware/validate.js`, `services/reward.service.js` |
| **Correct-answer exposure** | `correctOption` and `captchaText` are `select:false` and never serialized. `toPublicChallenge()` whitelists fields. History uses a field whitelist. | `models/CaptchaChallenge.js`, `captcha.service.js` |
| **Replay attacks** | `ACTIVE → COMPLETED` is a compare-and-set on `{status:'ACTIVE', expiresAt:{$gt:now}}`; the second request matches nothing and gets `CHALLENGE_ALREADY_COMPLETED`. Unique index on `captchaattempts.challengeId`. | `verifyChallenge()` |
| **Duplicate / concurrent rewards** | Verify: only one concurrent request wins the compare-and-set. Claim: `PENDING → CLAIMED` compare-and-set, then wallet `$inc` + ledger row in one transaction. Unique index `(type, referenceId)` on the ledger is a final backstop. Covered by the concurrent tests (20× verify, 10× claim). | `claimReward()`, `GemTransaction` index |
| **Challenge theft / cross-user access** | Every lookup is `{challengeId, userId: <from JWT>}`. Another user's id returns `404` (not 403) so ids can't be probed; logged as `CROSS_USER_ACCESS`. | `verifyChallenge()`, `claimReward()` |
| **User impersonation** | HS256 JWT, algorithm pinned on verify, secret required (≥ 32 chars) in production, account re-loaded per request (disabled users are cut off). Passwords: bcrypt cost 12, constant-time-ish compare for unknown emails. `userId` params/bodies are never read. | `middleware/auth.js` |
| **API abuse / scripts** | `express-rate-limit`: global 300/min/IP; per-user `current` 60/min, `new` 20/min, `verify` 30/min, `claim` 30/min; login 20 per 15 min/IP. Daily cap of 500 challenges per user. Body limit 10 kB. Helmet headers. Strict CORS allow-list. | `middleware/rateLimit.js`, `config/index.js` |
| **Challenge flooding** | One active challenge per user (partial unique index); `GET /current` returns the existing one instead of creating more. | `CaptchaChallenge` index |
| **Race conditions** | See above, plus `runAtomic()` transactions on replica sets and manual compensation on standalone. | `config/db.js` |
| **Floating-point drift** | Integer milli-gems. | `utils/money.js` |
| **Information leakage** | Errors are JSON codes; 500s hide internals in production; `x-powered-by` removed. | `middleware/error.js` |
| **Secrets** | `.env` git-ignored; `.env.example` has placeholders; no production credentials needed. | `.gitignore` |

## Expiry and timing
Challenge lifetime `CAPTCHA_EXPIRY_SECONDS` (default **120 s**). Unclaimed rewards can be claimed for `CLAIM_WINDOW_SECONDS` (default **600 s**). The UI countdown is cosmetic; the server compares `expiresAt` with its own clock.

## Audit log events
`CHALLENGE_CREATED`, `CHALLENGE_VERIFIED`, `REWARD_CREATED`, `REWARD_CLAIMED`, `REWARD_DECLINED`, `DUPLICATE_ATTEMPT`, `DUPLICATE_CLAIM`, `INVALID_ATTEMPT`, `EXPIRED_CHALLENGE`, `CROSS_USER_ACCESS`, `SUSPICIOUS_REQUEST`, `LOGIN_FAILED`, `RATE_LIMITED`.

## Known limitations (be honest in review)
1. **The challenge is a "match the code" task.** In the default `text` mode the code the user must match is shown, so the correct option is visible to anyone (or any script) that reads the `question` field. This follows the assignment's response example. The backend still never says *which option is correct*, and rewards are gated by rate limits, daily caps, one-claim-per-challenge and the ledger, but this is **not a bot barrier**. `CAPTCHA_RENDER_MODE=image` sends a distorted SVG instead of text, which raises the bar slightly; real bot resistance would need a proper CAPTCHA/risk service.
2. Rate limiting uses the in-process memory store: limits are per instance. Use `rate-limit-redis` when running more than one instance (see `SCALING.md`).
3. JWT is kept in `localStorage` for simplicity; an XSS bug would expose it. A hardened deployment would use `HttpOnly; Secure; SameSite` cookies + CSRF protection and short-lived access tokens with refresh rotation.
4. "No Thanks" **forfeits** the pending reward (design decision, see README).
5. No device/IP risk scoring, email verification or CAPTCHA on login yet.
