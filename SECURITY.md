# Security policy

Magnexis Voice is an early functional pilot. It is not security-audited or cleared for collecting general-public voice submissions.

## Reporting a vulnerability

Please **do not** post proof-of-concept exploits, credential leaks, customer audio, authentication bypasses or private contributor information in public GitHub issues. Contact the maintainers privately using the repository's GitHub security advisory interface if enabled, or the organization's publicly listed contact channel. Do not assume a private inbox exists unless the owner has configured one.

Include the affected revision, endpoint/component, steps to reproduce using synthetic data, expected and observed behavior, and potential impact. Do not access real contributor data, scan third-party systems, or use accounts without authorization.

## Current security boundaries

Implemented protections include password hashing, HttpOnly session cookies, server-side authorization for submissions/review, audio container checks and limits, duplicate-vote/self-review restrictions, moderation flags, private object storage, and approved-only exports.

**Open items before production:** verification/password recovery, abuse mitigation at the edge, race-condition hardening, human moderation and appeals, consent/age screening, privacy notice and retention controls, security monitoring and backups, and a production deployment audit.
