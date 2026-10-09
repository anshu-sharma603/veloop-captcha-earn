# Testing

## 1. Automated tests (`backend/tests`)

```bash
cd backend
npm test                       # runs all three files
node --test tests/generator.test.js tests/ratelimit.test.js   # no database needed
```

`api.test.js` needs MongoDB **with a replica set** so transactions are exercised:
* set `TEST_MONGO_URI` to a throw-away Atlas database (e.g. `mongodb+srv://.../veloop_test`), **or**
* leave it unset: `mongodb-memory-server` downloads and starts an in-memory replica set (needs internet access).

The test run **drops the target database**, so never point it at real data.

| Requirement | Test (file › name) |
|---|---|
| Exactly 4 options, 1 correct / 2 similar / 1 different, letters + digits | `generator` › every challenge has exactly 4 unique options… |
| Correct answer hidden | `api` › GET /current returns 4 options and never the correct answer |
| Correct answer → +1, claim credits once, ledger row | `api` › correct answer => CORRECT… |
| Wrong answer → +0.5 exact | `api` › wrong answer => WRONG… |
| **Concurrent verify never +2** (mandatory) | `api` › MANDATORY: concurrent verify… (20 parallel) |
| Duplicate claim (10 parallel) → one ledger row | inside the *correct answer* test |
| Duplicate verification | `api` › duplicate verification fails… |
| Fake reward / isCorrect / userId | `api` › fake reward + fake isCorrect + fake userId are ignored |
| Challenge-ID manipulation / user isolation | `api` › another user cannot verify or claim… |
| Invalid / missing option, invalid id | `api` › invalid / missing option and bad challenge id |
| Expired challenge | `api` › expired challenge is rejected… |
| No Thanks / old CAPTCHA unusable | `api` › No Thanks: /new closes old challenge… |
| Refresh keeps pending reward | `api` › refresh before claiming resumes… |
| History isolation, no answer leak | `api` › history is own-only… |
| One active challenge under concurrency | `api` › simultaneous /current calls… |
| Unauthorized | `api` › unauthorized requests are rejected; `ratelimit` › … 401 |
| Rate limit | `ratelimit` › 4th login attempt … 429 |
| Integer money, no drift | `generator` › milli-gem money helpers… |

## 2. Postman (`postman/VELoop-Captcha.postman_collection.json`)

1. `npm run seed` then `npm run dev` in `backend`.
2. Import the collection. Collection variable `baseUrl` = `http://localhost:5000/api`.
3. Run the folders **in order** with the Collection Runner: *Auth* → *Happy path* → *Negative / abuse tests*. Every request has assertions. Requires `CAPTCHA_RENDER_MODE=text`.
4. Manual items: **EXPIRED** (start API with `CAPTCHA_EXPIRY_SECONDS=5`, call *Get CAPTCHA*, wait 6 s, send) and **Rate limit** (run *New CAPTCHA* 40 iterations; from the 21st the response is `429`).

## 3. Manual UI checklist

| Scenario | How | Expected |
|---|---|---|
| Correct | Pick the option equal to the big code | "CORRECT", +1 Gem, Claim / No Thanks |
| Wrong | Pick any other option | "INCORRECT", +0.5 Gems |
| Claim | Click Claim | "Preparing reward…" → demo ad → "Reward completed" → new code; header balance increases |
| No Thanks | Click No Thanks | New code, balance unchanged |
| Duplicate submission | DevTools → copy the verify request as cURL, run it twice | second returns `409 CHALLENGE_ALREADY_COMPLETED` |
| Expired | Wait for the countdown to hit 0 | Notice + new code |
| Fake reward | Replay verify with `"reward":100000` | Server reward only; see `auditlogs` → `SUSPICIOUS_REQUEST` |
| Concurrent | Fire verify twice at once (Postman Runner / `Promise.all`) | One success, one 409, balance moves once |
| Unauthorized | Delete `veloop_token` in Application → Local Storage, reload | Redirect to login |
| Refresh mid-result | Verify, refresh before claiming | Result card returns, Claim still works |
| Responsive | DevTools at 320 px, 768 px, 1440 px | No horizontal scroll, options ≥ 64 px high |

## 4. Evidence for submission
Add screenshots / run output under `docs/screenshots/` and link them here: correct, wrong, claim, no thanks, new CAPTCHA, duplicate submission, expired, fake reward, concurrent request, unauthorized, Atlas view of `captchachallenges`, `gemtransactions`, `wallets`, `auditlogs`.
