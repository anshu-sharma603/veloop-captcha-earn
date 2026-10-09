# VELoop Rewards · CAPTCHA Earn (MERN)

A full-stack CAPTCHA Earn module: users solve a code-matching challenge, the **server** decides the result and the reward, and Gems are credited to a **server-side wallet with a ledger**. The React UI recreates the supplied VELoop design (dark navy, gold Gems, violet/cyan accents).

> The frontend displays the experience. The backend owns the truth.

```
React (Vite)  ──JWT──▶  Express API  ──Mongoose──▶  MongoDB
 UI + animations        validation, rate limits,     users, wallets, challenges,
 no secrets             challenge/reward logic       attempts, ledger, config, audit
```

## Quick start (local)

Requirements: Node 18+, a MongoDB you own (free Atlas M0 cluster recommended; Atlas gives you transactions).

```bash
# 1. backend
cd backend
cp .env.example .env          # set MONGO_URI and a long random JWT_SECRET
npm install
npm run seed                  # reward config + demo users (100 Gems each)
npm run dev                   # http://localhost:5000

# 2. frontend (new terminal)
cd frontend
cp .env.example .env          # leave VITE_API_BASE_URL empty locally (Vite proxies /api)
npm install
npm run dev                   # http://localhost:5173
```

Demo login: **demo@veloop.test / Demo@12345** (starts with 100 Gems). Second user for isolation tests: `demo2@veloop.test` (same password). Change these in `.env` (`DEMO_*`) for any public deployment.

Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## How it works

1. `GET /api/captcha/current`: backend generates a 6-character letters+digits code (CSPRNG), builds **4 unique options** (1 correct, 2 similar via swaps/lookalike glyphs, 1 completely different), shuffles them, stores `correctOption` privately and returns only `challengeId`, `question`, `options`, `expiresAt`.
2. The user taps an option → UI locks, plays a ~0.5 s scan animation while `POST /api/captcha/verify` runs → "Checking your answer…" → result. **No submit button.**
3. The server checks ownership, expiry, state and option membership, flips the challenge `ACTIVE → COMPLETED` atomically, reads the reward from `CaptchaRewardConfig` (+1 correct / +0.5 wrong) and stores it as `rewardStatus: PENDING`.
4. **Claim** (`POST /captcha/claim`) atomically flips `PENDING → CLAIMED`, increments the wallet and writes a `GemTransaction` (before/after balance), in one MongoDB transaction. A mock "rewarded ad" demo state plays, then a fresh CAPTCHA loads.
5. **No Thanks** / **New Code** → `POST /captcha/new`: the old challenge is closed forever and a new one is created.

### Design decisions (please read)
* **Gems are credited on Claim, not on verify.** The assignment asks for both a real claim flow with duplicate protection and a ledger entry per reward; crediting at claim satisfies "claim cannot be repeated" with a single authoritative credit point. Verify records the result, the reward and the audit/attempt rows.
* **No Thanks forfeits the pending reward.** If you'd rather auto-credit on verify, move the `claimReward` body into `verifyChallenge`'s transaction; the schema supports either.
* **Fractional Gems** are stored as integer milli-gems (1 Gem = 1000) to avoid floating-point drift (`docs/DATABASE.md`).
* **Refresh-safe:** if the user reloads after verifying, `GET /current` returns the pending result so the reward can still be claimed (for `CLAIM_WINDOW_SECONDS`).
* Defaults: challenge expiry 120 s, claim window 600 s, rate limits listed in `docs/SECURITY.md`; all configurable via `.env`.
* The assignment's design shows a "Submit Answer" button; the written requirements say there must be **none**, so selection auto-verifies.

## Project structure
```
backend/   src/{config,controllers,middleware,models,routes,services,validators,utils}  seed/  tests/
frontend/  src/{components/captcha,components/common,pages,hooks,services,context,utils}
docs/      API_DOCUMENTATION.md  DATABASE.md  SECURITY.md  TESTING.md  SCALING.md (final challenge)
postman/   VELoop-Captcha.postman_collection.json
```

## Environment variables
See `backend/.env.example` (server, Mongo, JWT, CAPTCHA behaviour, reward defaults, rate limits, demo user) and `frontend/.env.example` (`VITE_API_BASE_URL`). Never commit `.env`.

## Deployment
* **Database:** MongoDB Atlas (your own project). Network access: allow your backend host. Run `MONGO_URI=<atlas uri> npm run seed` once.
* **Backend (Render / Railway):** root `backend`, build `npm install`, start `npm start`. Env: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (≥ 32 chars), `CLIENT_ORIGIN=https://<your-frontend-domain>`. Health check: `/api/health`.
* **Frontend (Vercel / Netlify):** root `frontend`, build `npm run build`, output `dist`, env `VITE_API_BASE_URL=https://<your-backend-domain>`. `vercel.json` / `public/_redirects` handle SPA routing.
* After deploying, log in with the demo account on the live site and confirm records appear in Atlas.

## Testing
`cd backend && npm test`, the Postman collection, and the manual checklist are described in `docs/TESTING.md`.

## Final challenge
The 100,000-attempts/day scaling answer is in `docs/SCALING.md`.

## Assignment checklist → where it lives
| Requirement | Location |
|---|---|
| Backend-generated challenge, hidden answer | `utils/generator.js`, `services/captcha.service.js` |
| 4 options (1 / 2 similar / 1 different) | `buildChallengeOptions()`, tested in `tests/generator.test.js` |
| Expiry, single use, user isolation | `verifyChallenge()`, `CaptchaChallenge` indexes |
| Reward config, wallet, ledger, claim | `reward.service.js`, `wallet.service.js`, `transaction.service.js`, `claimReward()` |
| Rate limiting, validation, audit log | `middleware/*`, `models/AuditLog.js` |
| React UI (cards, checking, result, mock ad, history) | `frontend/src/components/captcha/*` |
| Docs, Postman, tests | `docs/`, `postman/`, `backend/tests/` |
