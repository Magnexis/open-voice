<div align="center">

# Magnexis Voice

**Version 1.25.0 · Speech recording, review, and CC0 dataset pilot**

### Community-powered speech data, built with consent and independent review

**Record · Validate · Transcribe · Contribute**

[Website (deployment target)](https://magnexis-voice-commons.netlify.app) · [How it works](https://magnexis-voice-commons.netlify.app/how-it-works.html) · [Documentation](docs/SECURITY-AND-DEPLOYMENT.md) · [Contributing](CONTRIBUTING.md) · [Project security](SECURITY.md)

![Version](https://img.shields.io/badge/version-1.25.0-6C4AB6)
![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)
![Status](https://img.shields.io/badge/status-functional%20pilot-2663eb)
![Speech license](https://img.shields.io/badge/contributed%20speech-CC0%201.0-059669)
![Repository](https://img.shields.io/badge/source-public-475569)

</div>

---

**Magnexis Voice** is a contributor-focused web and desktop-shell project for gathering and curating speech recordings. Volunteers record scripted sentences or spontaneous responses, independently review clips, propose new sentences, and help transcribe approved audio. Small, approved sample datasets can be exported with metadata and license information.

The contributor workflow is inspired by the community-participation principles of [Mozilla Common Voice](https://commonvoice.mozilla.org/), but Magnexis Voice is an independently implemented project and is **not affiliated with or endorsed by Mozilla**.

> **Project maturity:** A locally tested **functional pilot**, not a production-audited public recording service. The [Netlify address](https://magnexis-voice-commons.netlify.app) is the intended deployment target; a successful production deployment and live recording flow have **not yet been verified**. Do not invite public contributors until the security, privacy, and deployment checklist has been completed.

## Experience

| Contribute | Validate | Curate |
| --- | --- | --- |
| Record five-sentence batches; rerecord or skip prompts | Independently approve or reject recordings | Approve new sentences and review transcriptions |
| Answer spontaneous speech prompts | Flag inappropriate audio for quarantine | Export approved small ZIP samples with CSV metadata |
| Explicitly dedicate contributions under CC0 1.0 | Prevent self-review and duplicate votes | Exclude rejected or flagged content from exports |

### Interface screenshots — desktop and mobile

Screenshots are captured from **local browser UI smoke tests using simulated API responses**. They illustrate the real application interface but **do not demonstrate a live hosted backend or a packaged Windows installer**.

**Desktop web interface**

![Magnexis Voice v1.25 scripted-speech recording view in a desktop browser](docs/visual-smoke-desktop.png)

**Mobile-responsive interface**

<img src="docs/visual-smoke-mobile.png" alt="Magnexis Voice v1.25 mobile-responsive recording interface" width="330">

### Desktop application — Electron

The repository includes an Electron desktop wrapper with browser sandboxing, trusted-origin navigation and scoped microphone permissions. It runs the same web and API workflows as the browser version.

```bash
npm install
# With the local server running in a separate terminal:
npm run desktop

# On Windows: build an unsigned x64 NSIS installer (not yet a published binary)
npm run desktop:build
```

Read the [desktop application guide](docs/DESKTOP.md). You can also run the manual **Build Windows Desktop** GitHub Actions workflow; an installer is not automatically available with the source code. Configure `MAGNEXIS_VOICE_URL` to a verified HTTPS deployment when using the hosted backend. [Desktop build workflow](.github/workflows/desktop-windows.yml).


## Search visibility and project information

Version 1.25 includes descriptive page metadata, canonical URLs, Open Graph/X share cards, Schema.org structured data, and indexable informational pages. Crawlers can discover the root sitemap at [`/sitemap.xml`](https://magnexis-voice-commons.netlify.app/sitemap.xml) and public documentation at the About, How It Works, and Datasets pages **after deployment**.

- [About the project](https://magnexis-voice-commons.netlify.app/about.html)
- [Recording and validation walkthrough](https://magnexis-voice-commons.netlify.app/how-it-works.html)
- [Dataset and licensing information](https://magnexis-voice-commons.netlify.app/datasets.html)
- [SEO verification checklist](docs/SEO.md)
- [Release history](CHANGELOG.md)

These links describe intended production routes; indexing depends on successful deployment, publicly accessible responses, search-console verification and crawl processing. No search ranking or indexing is guaranteed.

## Technical architecture

```text
public/                       Responsive contributor interface (HTML, CSS, JS)
lib/api.mjs                   Session, recording, review and export endpoints
lib/sqlite.mjs                Local relational persistence
lib/postgres.mjs              Netlify Database / PostgreSQL adapter
lib/audio-storage.mjs         Local filesystem and Netlify Blobs adapters
lib/schema.mjs                Initial language prompts and local schema
netlify/functions/api.mjs     Hosted API entry point
netlify/database/migrations/  Versioned PostgreSQL schema migrations
desktop/                      Electron desktop wrapper and build config
tests/                        End-to-end API / persistence integration tests
.github/workflows/            CI checks and opt-in Netlify deployment workflow
```

| Layer | Development | Hosted target |
| --- | --- | --- |
| User interface | Local Node HTTP server | Netlify static hosting |
| API | `server.mjs` + shared API | Netlify Functions |
| Database | SQLite | Netlify Database (PostgreSQL) |
| Audio storage | Local disk | Netlify Blobs |
| Authentication | Email/password + secure password hashes and sessions | Same session system (HTTPS cookies) |
| Desktop | Electron launcher | Uses the same web backend |

**Not implemented:** Magnexis OIDC single sign-on, social sign-in, email verification/password recovery, packaged/signed installer distribution, large-scale export jobs, and production-grade moderation tooling. These are on the roadmap, not shipped features.

## Quick start

**Requirements:** Node.js 22 or newer. The local server uses Node's built-in SQLite module and does not need npm packages installed. Node may print an experimental SQLite warning.

```bash
# Start the local site and persistent API
node server.mjs
# http://localhost:8888

# Run six API/persistence tests and the source checks
npm run check
```

The local server keeps application data in ignored `data/voice.sqlite` and `data/audio/`. Create separate contributor accounts to review each other's items; approval requires two independent positive votes.

To work with the hosted dependencies or launch the Electron wrapper:

```bash
npm install
npm run desktop
```

See [Security & Deployment](docs/SECURITY-AND-DEPLOYMENT.md) for hosted environment setup, service dependencies, data-privacy constraints and production readiness.

## API surface

| Area | Endpoints |
| --- | --- |
| Identity | `GET /api/auth/me`, `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout` |
| Catalogue | `GET /api/config`, `/api/stats`, `/api/sentences`, `/api/prompts` |
| Sentences | `POST /api/sentences`, `GET/POST /api/sentences/review` |
| Audio | `POST /api/recordings`, `GET /api/recordings/next`, `POST /api/recordings/review`, `/api/recordings/report`, `GET /api/audio/:id` |
| Transcription | `GET /api/transcriptions/next`, `POST /api/transcriptions`, `GET/POST /api/transcriptions/review` |
| Dataset export | `GET /api/datasets/export?kind=scripted` or `kind=spontaneous` |

Audio uploads are size and content-type checked. Approval uses two independent positive reviews with no negative reviews. Approved exports omit contributor account information; flagged audio is excluded. These controls reduce risk, but they do not replace operational moderation or professional security review.

## Deployment

This repository includes Netlify Functions, PostgreSQL migrations, an **optional manual Windows Electron packaging workflow**, and a **manual** GitHub Actions production deployment workflow. It does not publish automatically on every push.

1. Install dependencies and validate the project: `npm install && npm run check`.
2. Confirm eligibility and provision the Netlify Database; validate migrations using `netlify dev` and `netlify database migrations apply` **locally**.
3. Configure Netlify-hosted services and test a restricted preview, including Blob storage and permissions.
4. To enable the workflow, set GitHub Actions secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` (the existing Netlify project ID is `d3ed6054-6fd4-4b28-a2db-606de5df2a70`). Never place tokens in source code.
5. Run **Deploy Magnexis Voice to Netlify** via GitHub Actions *only after* preview and privacy/security checks pass.
6. Verify live API endpoints, registration, browser microphone permission, uploads, audio review and exports before publicly inviting participation.

The deployment URL is https://magnexis-voice-commons.netlify.app. Visitor-level SSO/password protection has been disabled on the existing Netlify project, but **deploy success is not established by that setting alone**. Database/storage usage may incur provider charges.

## Contributing, licensing and responsibility

- Contributions and bug reports are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before sending a PR.
- Follow the project [security reporting policy](SECURITY.md); do not publish exploitable vulnerabilities or private data in issues.
- **Speech contributions:** Contributors must explicitly consent to the **CC0 1.0 Universal** dedication for submitted material. Participants should record only their own voice and avoid personal information.
- **Source code:** Public visibility is not a grant of an open-source license. No general source-code license is granted unless the repository owner adds one separately. Third-party marks remain their respective owners' property.
- **Privacy:** Once CC0 data is distributed, copies held by third parties cannot be recalled. Human review, data-removal processes, and a final privacy policy are required before open enrollment.

---

<div align="center">

**A project by [Magnexis](https://github.com/Magnexis)** · [Website](https://magnexis-voice-commons.netlify.app) · [Workflow comparison](docs/WORKFLOW-COMPARISON.md)

</div>