# Magnexis Voice

**An original community speech-contribution platform with real persistent recording and review workflows.** Inspired by the broader open-data participation model of Mozilla Common Voice, but independently designed and written.

## What is implemented

- Responsive, original scripted speech collection with five-sentence queue, microphone start/stop, preview, rerecord, skip, and explicit CC0 batch submission.
- Spontaneous speech prompts and recording capture.
- Account creation/sign-in/out using salted `scrypt`, hashed persistent sessions, HttpOnly / SameSite cookies.
- Private audio blob persistence and relational metadata: local Node + SQLite and hosted Netlify Functions + PostgreSQL / Blobs adapters.
- Independent yes/no/skip audio validation; unique reviewer votes; self-review excluded; reports quarantine audio.
- Sentence submissions and independent review, plus spontaneous speech transcription and transcription review.
- ZIP sample datasets with approved audio, `metadata.csv`, `LICENSE.txt`, and no contributor account details.
- Minimal Electron Windows desktop launcher using the same backend; release installer is not built.
- Netlify migrations, site config, GitHub-to-Netlify workflow, and six passing integration tests.

## Run locally

Requires Node.js 22+. The local server and tests have **no npm install prerequisite**; Node's built-in SQLite module has an experimental warning.

```bash
node server.mjs
# Open http://localhost:8888
```

Use separate accounts to validate one another's submissions. Each accepted contribution requires two independent positive reviews. Data persists to `data/voice.sqlite` and `data/audio/` (both Git-ignored).

```bash
npm run check
# or: node --test tests/*.test.mjs
```

The implementation was tested locally at the API/integration-test layer (6 passing tests). Browser-level microphone testing was **not possible** in this container. Do not interpret the previous mockup as a working screenshot.

## Hosted Netlify deployment

Project `magnexis-voice-commons` exists in Netlify, but **these source files have not been deployed there** and the project requires team SSO for visitors. The public service is therefore **not yet verified to be accessible**.

Run on a networked developer machine:

```bash
npm install
npx netlify dev
npx netlify database migrations apply
npm run check
```

The `@netlify/database` and `@netlify/blobs` SDKs are declared as dependencies. Netlify's auto-provisioned PostgreSQL database and versioned migration apply at deployment; the Blob store persists uploaded objects. `netlify/functions/api.mjs` handles `/api/*`. To deploy from GitHub (public or private), configure GitHub Action secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` and use the workflow in `.github/workflows/deploy-netlify.yml` after testing a preview. Database usage may incur Netlify credits.

## Contributor API

| Category | Routes |
| --- | --- |
| Identity | `GET /api/auth/me`, `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout` |
| Public | `GET /api/config`, `/api/stats`, `/api/sentences`, `/api/prompts` |
| Original text | `POST /api/sentences`, `GET/POST /api/sentences/review` |
| Speech | `POST /api/recordings`, `GET /api/recordings/next`, `POST /api/recordings/review`, `POST /api/recordings/report`, `GET /api/audio/:id` |
| Transcription | `GET /api/transcriptions/next`, `POST /api/transcriptions`, `GET/POST /api/transcriptions/review` |
| Dataset | `GET /api/datasets/export?kind=scripted|spontaneous` |

## Documentation

- [`docs/SECURITY-AND-DEPLOYMENT.md`](docs/SECURITY-AND-DEPLOYMENT.md) — production checklist, limitations, privacy obligations.
- [`docs/WORKFLOW-COMPARISON.md`](docs/WORKFLOW-COMPARISON.md) — workflow comparison and artwork provenance.
- [`docs/screen-speak.png`](docs/screen-speak.png) — **earlier concept mockup, not a screenshot of running code**.

## Current release boundaries

This is a tested **functional pilot**. It is **not** an audited production platform. Email verification/recovery, OIDC Magnexis SSO, full-scale archival, moderation operations and live Netlify integration remain to be completed before an open public launch. Currently English only. Source ownership remains with Magnexis; donated contributions are explicitly CC0 1.0.

## Publishing this repository publicly

Create a new **public** repository under the `Magnexis` GitHub organization named `magnexis-voice` (do not initialize it with a README). The local source is committed on `main`; then push with `git push -u origin main` from a GitHub-authenticated machine. A public repository does not automatically make the app production-ready: review moderation, privacy/retention policy, email verification and SSO before soliciting contributions.
