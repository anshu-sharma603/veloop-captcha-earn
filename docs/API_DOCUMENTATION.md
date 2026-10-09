# API Documentation

Base URL (local): `http://localhost:5000/api` · All bodies are JSON · All endpoints except `/auth/*` and `/health` need `Authorization: Bearer <JWT>`.

Identity is **always** taken from the JWT. Any `userId` in a body, query or path is ignored.

## Response envelope

Success: `{ "success": true, ... }`  
Error: `{ "success": false, "code": "SOME_CODE", "message": "Human readable text" }`

Money objects look like `{ "currency": "GEMS", "amount": 0.5, "display": "0.50" }`.

## Error codes

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing / malformed field (e.g. no `selectedOption`, bad `challengeId` format) |
| 400 | `INVALID_OPTION` | `selectedOption` is not one of the 4 options of this challenge |
| 401 | `UNAUTHORIZED` / `INVALID_TOKEN` / `INVALID_CREDENTIALS` | No / bad / expired token, wrong login |
| 404 | `CHALLENGE_NOT_FOUND` | Unknown id **or a challenge owned by another user** (existence is not leaked) |
| 409 | `CHALLENGE_ALREADY_COMPLETED` | Second verify of the same challenge |
| 409 | `CHALLENGE_DISCARDED` | Challenge was closed by "New Code" / "No Thanks" |
| 409 | `REWARD_ALREADY_CLAIMED` | Second claim |
| 409 | `REWARD_DECLINED` | Claiming after "No Thanks" |
| 409 | `CHALLENGE_NOT_VERIFIED` | Claim before verify |
| 410 | `CHALLENGE_EXPIRED` | Verify after `expiresAt` |
| 410 | `CLAIM_EXPIRED` | Claim after the claim window |
| 429 | `RATE_LIMITED` / `DAILY_LIMIT_REACHED` | Too many requests / daily challenge cap |

---

## POST /auth/login
Auth: none. Rate limited per IP.
```json
{ "email": "demo@veloop.test", "password": "Demo@12345" }
```
`200` → `{ "success": true, "token": "<jwt>", "user": { "id", "name", "email" }, "balance": { ... } }`  
Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.  
`POST /auth/register` (`name`, `email`, `password` ≥ 8 chars) behaves the same and creates an empty wallet.

## GET /captcha/config
Auth: JWT. Reward amounts and timings the UI should display.
```json
{ "success": true, "config": { "currency": "GEMS",
  "correctReward": { "currency": "GEMS", "amount": 1, "display": "1.00" },
  "wrongReward":   { "currency": "GEMS", "amount": 0.5, "display": "0.50" },
  "optionsPerChallenge": 4, "challengeExpirySeconds": 120, "claimWindowSeconds": 600, "verifyAnimationMs": 500 } }
```

## GET /captcha/current
Auth: JWT. Rate limit: 60/min/user.  
Returns, in this order: (1) a verified-but-unclaimed reward (so a page refresh does not lose it), (2) the user's live challenge, (3) a freshly generated challenge.
```json
{ "success": true, "state": "CHALLENGE",
  "challenge": { "challengeId": "CAP-9F3A1C7E2B", "question": "A7K2P9",
    "options": ["AJK29P", "X4M8Q1", "A7K2P9", "A7L9P2"],
    "expiresAt": "2026-10-01T11:02:00.000Z", "expiresInSeconds": 118 } }
```
or `{ "success": true, "state": "RESULT", "result": { "challengeId", "result": "CORRECT", "reward": {...}, "rewardStatus": "PENDING", "claimable": true, "claimableUntil": "..." } }`.  
With `CAPTCHA_RENDER_MODE=image`, `question` is replaced by `imageSvg` (data URI).  
`correctOption` is never present.

## POST /captcha/verify
Auth: JWT. Rate limit: 30/min/user.
```json
{ "challengeId": "CAP-9F3A1C7E2B", "selectedOption": "A7K2P9" }
```
Validation: `challengeId` matches `^CAP-[A-F0-9]{10}$`; `selectedOption` 1–16 chars. **Unknown fields (`reward`, `isCorrect`, `userId`, …) are stripped and logged as `SUSPICIOUS_REQUEST`.**  
Server checks, in order: exists for this user → not completed/discarded → not expired → option belongs to challenge → atomic `ACTIVE → COMPLETED` (compare-and-set).
```json
{ "success": true, "challengeId": "CAP-9F3A1C7E2B", "result": "CORRECT",
  "reward": { "currency": "GEMS", "amount": 1, "display": "1.00" },
  "rewardStatus": "PENDING", "claimable": true, "claimableUntil": "2026-10-01T11:12:00.000Z",
  "balance": { "currency": "GEMS", "amount": 100, "display": "100.00" } }
```
`result` is `CORRECT` or `WRONG`. Gems are credited by **claim**, so `balance` here is still the pre-claim balance.  
Errors: 400, 404, 409 `CHALLENGE_ALREADY_COMPLETED`, 410 `CHALLENGE_EXPIRED`, 429.

## POST /captcha/claim
Auth: JWT. Rate limit: 30/min/user. Idempotent: only one call per challenge can ever succeed.
```json
{ "challengeId": "CAP-9F3A1C7E2B" }
```
```json
{ "success": true, "challengeId": "CAP-9F3A1C7E2B", "rewardStatus": "CLAIMED",
  "reward": { "currency": "GEMS", "amount": 1, "display": "1.00" }, "transactionId": "TXN-3C1F9A2B7D4E8F01",
  "balance": { "before": { "amount": 100 }, "after": { "amount": 101 } } }
```
Errors: 404, 409 `REWARD_ALREADY_CLAIMED` / `REWARD_DECLINED` / `CHALLENGE_NOT_VERIFIED`, 410 `CLAIM_EXPIRED`.

## POST /captcha/new
Auth: JWT. Rate limit: 20/min/user. Body: `{}`.  
Used by **New Code** and **No Thanks**. Marks the live challenge `DISCARDED`, forfeits any unclaimed reward (`DECLINED`), creates a new challenge. Returns `201 { success, state: "CHALLENGE", challenge }`.

## GET /captcha/history?page=1&limit=10
Auth: JWT. Own completed challenges, newest first. `limit` ≤ 50. Never contains `correctOption`, `captchaText` or `options`.
```json
{ "success": true, "total": 3, "page": 1, "limit": 10,
  "items": [ { "challengeId": "CAP-…", "date": "…", "result": "WRONG", "reward": { "amount": 0.5, "display": "0.50" }, "rewardStatus": "CLAIMED", "claimedAt": "…" } ] }
```

## GET /wallet/gems
`{ "success": true, "balance": { "currency": "GEMS", "amount": 101.5, "display": "101.50" } }`

## GET /wallet/transactions
Last 50 ledger rows: `transactionId`, `type`, `source`, `referenceId` (= challengeId), `amount`, `balanceBefore`, `balanceAfter`, `status`, `createdAt`.

## GET /health
`{ "success": true, "status": "ok" }` (no auth; use for uptime checks).
