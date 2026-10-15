# TESTING: VELoop Rewards CAPTCHA Earn

Tested against the deployed backend (`https://veloop-captcha-earn-t7tc.onrender.com`) with Postman and against the React frontend (local and Vercel). Date of testing: 11 October 2026.

Postman collection: `postman/VELoop-Captcha.postman_collection.json`

## Summary

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Login | JWT returned | PASS |
| 2 | Get CAPTCHA | 4 options, no `correctOption` in response | PASS |
| 3 | Correct answer | `CORRECT`, reward 1 Gem, status `PENDING` | PASS |
| 4 | Wrong answer | `WRONG`, reward 0.5 Gem, status `PENDING` | PASS |
| 5 | Claim | reward marked `CLAIMED`, balance updated | PASS (UI: history shows Claimed, balance 103 to 104) |
| 6 | Duplicate claim | rejected, no second reward | PASS (409) |
| 7 | Duplicate verification | rejected, no second reward | PASS (409) |
| 8 | Fake reward and fake `isCorrect` | both ignored | PASS |
| 9 | Unauthorized request | 401, no CAPTCHA | PASS |
| 10 | Invalid challengeId format | 400 validation error | PASS |
| 11 | No Thanks then new CAPTCHA | old challenge closed, new one issued | PASS (UI) |
| 12 | Expired challenge | rejected, no reward | PASS (410 `CHALLENGE_EXPIRED`) |
| 13 | Invalid challenge (valid format, not found) | 404, no reward | PASS (404 `CHALLENGE_NOT_FOUND`) |
| 14 | Invalid option / missing option | 400, no reward | PASS (400 `INVALID_OPTION` / 400 `VALIDATION_ERROR`) |
| 15 | Fake userId in body | ignored, identity from JWT | PASS (200, normal result for the logged-in user) |
| 16 | Wrong user (other user's challenge) | 403/404, no reward | TODO |
| 17 | Concurrent verify (2 requests) and claim (3 requests) | only one reward | PASS (verify 200 / 409, claim 409 / 200 / 409) |
| 18 | Rate limit | 429 after limit | TODO (first attempt hit a connection timeout, not a 429; to be re-run) |

Tests marked TODO have not been completed yet; no result is claimed until it has been run.

---

## 1. Get CAPTCHA: correct answer is never exposed

`GET /api/captcha/current`

```json
{
    "success": true,
    "state": "CHALLENGE",
    "challenge": {
        "challengeId": "CAP-FAEADE64FA",
        "options": ["F92DHK", "F58DHK", "TBP96G", "F56DHS"],
        "expiresAt": "2026-10-11T06:58:25.315Z",
        "expiresInSeconds": 120,
        "question": "F58DHK"
    }
}
```

Exactly 4 options, 120 second expiry, and no `correctOption` field.

## 2. Correct answer

`POST /api/captcha/verify` with `{ "challengeId": "CAP-FAEADE64FA", "selectedOption": "F58DHK" }`

```json
{
    "success": true,
    "state": "RESULT",
    "result": {
        "challengeId": "CAP-FAEADE64FA",
        "result": "CORRECT",
        "reward": { "currency": "GEMS", "amount": 1, "display": "1.00" },
        "rewardStatus": "PENDING",
        "claimable": true,
        "claimableUntil": "2026-10-11T07:06:40.568Z"
    }
}
```


## 3. Wrong answer and fake reward (anti-cheat)

Request body deliberately contains a wrong option plus client-supplied cheating fields:

```json
{ "challengeId": "CAP-B286A51BCB", "selectedOption": "M35ZJA", "isCorrect": true, "reward": 100000 }
```

Response (HTTP 200): the backend ignored `isCorrect` and `reward`, decided `WRONG` on its own and applied the configured wrong-answer reward.

```json
{
    "success": true,
    "challengeId": "CAP-B286A51BCB",
    "result": "WRONG",
    "reward": { "currency": "GEMS", "amount": 0.5, "display": "0.50" },
    "rewardStatus": "PENDING",
    "claimable": true
}
```


## 4. Claim and duplicate claim

First claim: reward moves from `PENDING` to `CLAIMED` and the wallet balance increases (web app: balance 103.00 to 104.00, history shows "Claimed").

Second claim of the same challenge, `POST /api/captcha/claim`:

```json
{
    "success": false,
    "code": "REWARD_ALREADY_CLAIMED",
    "message": "This reward has already been claimed."
}
```

HTTP status: `409 Conflict`. No second reward was created.


## 5. Duplicate verification (replay)

Submitting an already completed challenge again, `POST /api/captcha/verify`:

```json
{
    "success": false,
    "code": "CHALLENGE_ALREADY_COMPLETED",
    "message": "This CAPTCHA has already been completed."
}
```

HTTP status: `409 Conflict`.


## 6. Unauthorized request

`GET /api/captcha/current` without a bearer token:

```json
{
    "success": false,
    "code": "UNAUTHORIZED",
    "message": "Authentication required."
}
```

HTTP status: `401 Unauthorized`.


## 7. Invalid challengeId format

`POST /api/captcha/verify` with a malformed `challengeId`:

```json
{
    "success": false,
    "code": "VALIDATION_ERROR",
    "message": "challengeId: invalid challengeId format"
}
```

HTTP status: `400 Bad Request`.

## 8. Frontend flows (React app)

Verified manually on the deployed app (local and Vercel): challenge screen with 4 options, correct result (+1 Gem), wrong result (+0.5 Gems), claim then mock-ad then new CAPTCHA, No Thanks then new CAPTCHA, and the Recent activity list showing Correct/Wrong with Claimed/Not claimed.

## 9. Automated negative tests (`negative-tests.mjs`)

These were run against the deployed backend with a Node script (real HTTP requests, logged in as the demo user). Output of the run:

```
PASS  Invalid challenge  ->  404 CHALLENGE_NOT_FOUND
PASS  Missing option  ->  400 VALIDATION_ERROR
PASS  Invalid option  ->  400 INVALID_OPTION
PASS  Fake userId  ->  200 CORRECT
PASS  Concurrent verify (x2)  ->  200 / 409
PASS  Concurrent claim (x3)  ->  409 / 200 / 409
Waiting 125s for the challenge to expire...
PASS  Expired challenge  ->  410 CHALLENGE_EXPIRED
```

![Terminal output of negative-tests.mjs](docs/screenshots/11-negative-tests-terminal.png)

- Concurrent verify: two simultaneous requests for one challenge, one got 200 and the other 409, so the reward was created once.
- Concurrent claim: three simultaneous claims, exactly one got 200, the other two got 409.
- Fake `userId`: the extra field had no effect; the request was processed for the authenticated user.

## 10. Tests still to be recorded

- **Wrong user** (user B sends user A's `challengeId`): needs a second account.
- **Rate limit**: the first run sent 150 requests at once and the script stopped with a connection timeout (`UND_ERR_CONNECT_TIMEOUT`), which is not a 429 response, so no result is claimed. It will be re-run with smaller batches.
