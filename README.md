# Magnexis Voice

<div align="center">

**Community-powered speech collection and independent review**

[Website / deployment target](https://magnexis-voice-commons.netlify.app) · [Magnexis organization](https://github.com/Magnexis) · [Mozilla Common Voice](https://commonvoice.mozilla.org/)

![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)
![Project stage](https://img.shields.io/badge/status-functional%20pilot-2563eb)
![Speech data](https://img.shields.io/badge/contributed%20speech-CC0%201.0-059669)

</div>

---

**Magnexis Voice** is an independently built application for creating reviewed, reusable speech datasets. Contributors record scripted sentences and spontaneous responses, validate other submissions, propose sentences, and help transcribe approved audio. The application supports a responsive website, a shared persistent API, and an Electron desktop wrapper.

It follows the broad **community participation model** made familiar by Mozilla Common Voice, but it is an original implementation and is **not affiliated with or endorsed by Mozilla**.

> **Deployment status:** The URL above is the intended Netlify site, **not a verified live deployment of this code**. The current release is a locally tested pilot, not an audited or production-ready service. Do not invite contributors until hosted storage, registration, privacy, moderation and recording functionality have been tested.

## Key features

| Record | Validate | Build datasets |
| --- | --- | --- |
| Five-prompt scripted sessions with playback, rerecording and skipping | Independent yes/no speech votes and self-review prevention | Sentence proposals and independent review |
| Open-ended spontaneous speech recording | Duplicate-vote prevention and abuse reports | Transcript contribution and approval |
| Explicit CC0 consent for contributions | Two independent positive reviews required to approve recordings | Small ZIP downloads with audio, CSV metadata and CC0 information |

## Architecture

```text
public/                        Browser interface
lib/api.mjs                    Shared API and business rules
lib/sqlite.mjs                 Local persisted SQLite metadata
lib/postgres.mjs               Hosted Netlify Database adapter
lib/audio-storage.mjs          Local disk / private Netlify Blobs
netlify/functions/api.mjs      Hosted API entrypoint
netlify/database/migrations/   Versioned PostgreSQL migrations
desktop/                       Electron shell and Windows packaging config
tests/                         Persistent-workflow integration tests
.github/workflows/             Continuous verification and manual Netlify deployment
```

Local development uses **Node.js + SQLite + on-disk audio**. The hosted target uses **Netlify static hosting + Functions + PostgreSQL Database + private Blobs**. Authentication currently uses email/password and hashed sessions; **Magnexis OIDC, social sign-in, email verification and recovery are not implemented**.

## Run locally

Requires Node.js 22 or later:

```bash
node server.mjs
# Visit http://localhost:8888

npm run check
# Six automated integration tests plus project checks
```

The local application stores its database and recordings under ignored `data/`. The built-in Node SQLite module can emit an experimental API warning.

For the Electron wrapper and hosted development dependencies:

```bash
npm install
npm run desktop
```

## Deploy to Netlify

The existing intended site is **[magnexis-voice-commons.netlify.app](https://magnexis-voice-commons.netlify.app)** (site ID `d3ed6054-6fd4-4b28-a2db-606de5df2a70`). Its visitor-level SSO/password restriction was disabled, but **application deployment and backend provisioning remain unverified**.

1. Run `npm install && npm run check`.
2. Prepare Netlify Database; validate migrations locally using `netlify dev` and `netlify database migrations apply`.
3. Test a restricted preview, including end-to-end storage, consent and security controls.
4. Configure repository Actions secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`; never commit credentials.
5. After security and privacy review, manually run the **Deploy Magnexis Voice to Netlify** workflow.
6. Verify registration, real microphone capture, recording upload, validation, moderation, and exports on the deployed site.

Database usage may incur Netlify credits. The deployment workflow is **manual**, not automatically triggered by a push.

## Project boundaries and privacy

This is a **functional pilot**. The repository does not claim production hardening, global moderation, large corpus archival, password recovery or Magnexis OIDC support. Independently reviewed recordings are the only recordings included in sample exports; flagged audio is excluded.

**Speech submissions:** Contributors must explicitly dedicate their recordings to CC0 1.0 Universal, use their own voice, and avoid identifying details. Third-party downloads of dedicated recordings may not be recallable. Public recruitment requires a comprehensive privacy policy, age/consent protections, security review and operational moderation.

**Source code:** Public visibility does not automatically grant an open-source license. The source remains the property of its rights holders unless an explicit code license is published.

## Documentation and contributions

The complete source distribution includes:

- `docs/SECURITY-AND-DEPLOYMENT.md`: known limitations and production checklist.
- `docs/WORKFLOW-COMPARISON.md`: independent workflow/design provenance.
- `CONTRIBUTING.md`: contribution practices and test expectations.
- `SECURITY.md`: responsible security reporting.
- `docs/visual-smoke-desktop.png`: **local UI smoke-test screenshot with simulated API responses**; not a production-site screenshot.

---

<div align="center">

**Built by [Magnexis](https://github.com/Magnexis)** · [Web deployment target](https://magnexis-voice-commons.netlify.app)

</div>
