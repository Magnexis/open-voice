# Contributor-workflow comparison

Magnexis Voice is independently implemented and uses original artwork and project branding. Mozilla Common Voice is an inspiration for the broad **participation model**; this project is not affiliated with, endorsed by, or a copy of Mozilla Common Voice.

| Contributor behavior | Magnexis Voice implementation | Limitation |
| --- | --- | --- |
| Start with a short read-aloud sentence | Yes: five random original English prompts per batch | Only English seeded |
| Browser microphone recording and replay | MediaRecorder; start/stop, playback, re-record and skip | Needs microphone, supported browser and localhost/HTTPS |
| Explicit sharing consent | CC0 checkbox at submission, independent of account terms | CC0 is not revocable for already-shared copies |
| Persistent contribution | Authenticated POST to API; SQLite locally, PostgreSQL on Netlify and private Blob audio | Production Netlify integration not yet verified in a live deployment |
| Independent audio review | Yes/no/skip + report, one vote per user, self-votes blocked | Requires two *other* registered accounts to approve |
| Original sentence contributions | Free-form text + independent yes/no review | No plagiarism/PII automation; humans must review |
| Spontaneous speech | Five original open-ended prompts, up to 90 seconds | Single language and simple prompts |
| Transcription and validation | Community-authored transcript with separate reviewers | No diarization or timestamped alignment |
| Dataset export | CC0 ZIP with audio, metadata.csv, license | Up to 10 clips and 3.5 MB audio per request |
| User accounts | Email/password, scrypt, strict HttpOnly sessions | No email delivery/verification yet; OIDC disabled |
| Desktop application | Electron shell with origin-limited navigation and media permission | Installer needs packaging; no installer built locally |

## Artwork provenance

`public/` is an independently authored visual design: serif editorials, lavender panels, left hand navigation, metric counters, waveform and microphone control. The old `docs/screen-speak.png` was an *earlier design-only image*, not a verified screenshot of the application. The responsive interface passed a local desktop/mobile browser rendering smoke test with simulated API responses. This was not a production deployment or live microphone test.
