# Security and deployment — Magnexis Voice

## Local run (fully usable without Netlify)

Node.js 22+ is needed. The Node local server uses the built-in experimental SQLite API and local disk audio, with persistence under the ignored `data/` directory. It does not require `npm install` for this local path.

```bash
node server.mjs
# http://localhost:8888
node --test tests/*.test.mjs
```

The local API and SQLite integration tests have been run successfully in this environment. Real microphone capture in a supported browser has not been tested here.

## Hosted deployment — not yet verified

The source contains a Netlify Functions adapter, Netlify Database migration, and private Netlify Blobs storage. The npm registry was unreachable in the build container; the Netlify SDK modules could not be downloaded or dynamically integration tested. On a network-connected machine:

1. Publish this source repository to GitHub and connect the selected remote after review. Do not commit `data/`, `.env`, secrets or recordings.
2. Set GitHub Action secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` for the intended Netlify project. Use site ID `d3ed6054-6fd4-4b28-a2db-606de5df2a70` only after verifying that it belongs to your account. Do not paste your token in chat or the repo.
3. Install dependencies from npm and run `npm run check`. Use the latest Netlify CLI and verify availability/plan eligibility for Netlify Database, which may consume billed credits.
4. Run `netlify dev` and `netlify database migrations apply` to validate the migration against a real local PostgreSQL instance. Do **not** apply schema changes directly to production.
5. Deploy a **preview** first and exercise recording, review, download and session flows in the browser. Preview database branches may contain personal data; restrict preview access and do not share private test recordings casually. The API uses a deploy-scoped audio store for nonproduction deployments to avoid touching production blobs.
6. Verify site-level SSO/password settings in Netlify. Visitor-level Netlify SSO and password protection were disabled in the existing Netlify project as of October 24, 2026. This is not end-user Magnexis login, and it does not prove an application deployment exists.
7. After review, deploy to production from the repository with the included GitHub Action or your approved deployment workflow. Confirm live API, PostgreSQL and Blob behavior before inviting contributors.

## Controls implemented

- Session cookies are HttpOnly, SameSite=Strict and Secure on Netlify; 14-day database-backed hashed session tokens.
- Passwords use salted `scrypt`; account passwords never appear in dataset exports.
- Origin and `Sec-Fetch-Site` checks on POST endpoints; no cross-site CORS headers.
- Requires registered users for uploads, reviews, sentence contributions and transcription.
- 4 MB max recording, MIME and container header check, duration between 0.5 and 90 seconds.
- Account-level limits: 30 recordings/hour and 20 original sentences/hour. These are light spam controls, not substitutes for an edge WAF.
- Non-guessable recording IDs, private object store and gated audio access for pending recordings.
- One vote per reviewer enforced by composite unique primary keys; authors cannot validate their own submissions.
- Two independent positive reviews (and no negative reviews) for accepted items; two negative votes reject them. Abuse reports quarantine even previously approved recordings.
- Only approved recordings are downloadable. CSV metadata excludes user identity.
- CSP, X-Content-Type-Options, no framing, no cross-origin assets; Electron disables Node integration and cross-origin navigation.

## Unresolved production safeguards

**Do not launch an open public intake until these have been reviewed.** The current implementation is a functional pilot, not an audited or production-secure global data collection service. It still needs account email verification and password recovery; rate limiting by network/device at a shared edge; bot resistance; stronger audio decoding/anti-malware checks; dedicated human moderation and takedown/consent escalation; retention, data rights and child-safety policies; vulnerability and privacy testing; disaster recovery; and scalable archival jobs instead of small ZIP samples. Coordinated review votes must be made transactionally robust under high concurrency (currently unique reviewer votes and monotonic state updates prevent a duplicate vote but do not provide full serializable consensus).

### User identity

Email/password authentication is implemented. **OIDC / “Sign in with Magnexis” is not implemented or enabled**; it requires a deployed, controlled issuer, PKCE, correct JWT validation and account-linking rules. Do not advertise it as supported yet. Google/GitHub OAuth accounts are likewise not currently wired.

### Data consent

Contributors should use their own voice only, never record someone who has not consented, and avoid any identifying details. The CC0 legal dedication is irrevocable for already distributed copies. Deleting a recording from our server cannot retract copies previously downloaded by third parties. Obtain qualified legal/privacy review before collecting recordings from the general public, especially minors.

### Runtime limits and costs

Netlify Function responses have payload limits; small dataset archives cap audio to 3.5 MB with 10 clips maximum. Netlify Database can incur compute/network charges. Hosting a voice corpus at scale demands a cost and capacity budget.
