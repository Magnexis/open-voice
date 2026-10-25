# Contributing to Magnexis Voice

Thanks for helping improve community speech tooling. Contributions are reviewed for quality, security, accessibility, and respect for contributor consent.

## Before opening a pull request

1. Discuss large API or schema changes in an issue before implementation.
2. Use Node.js 22 or newer. Run `npm run check` and describe any untested pathways in your PR.
3. Keep features accessible and usable on desktop and mobile. Do not replace working functionality with screenshots or mocked responses.
4. Add automated tests for changes to authentication, recording lifecycle, validation, moderation, transcription, and exports.
5. Never include real user recordings, passwords, tokens, `.env` files, `data/`, or any production database dump in commits.
6. Describe the feature, tests executed, relevant privacy risks, and deployment/migration implications.

## Development

```bash
node server.mjs
npm run check
```

The local development server uses SQLite and on-disk audio; both are intentionally ignored by Git. For Netlify features, follow the hosted setup in `docs/SECURITY-AND-DEPLOYMENT.md` and exercise a preview before any production change.

## Contribution guidelines

- Prefer small, reviewable pull requests and clear commit subjects.
- Preserve the existing consent gating and anti-self-review rules.
- New database changes require **new timestamped migrations**; never edit migrations already applied in an environment.
- Use parameterized SQL, private object storage, conservative session handling, and no cross-origin audio exposure by default.
- Respect applicable privacy, recording-consent, accessibility, copyright, and data-licensing obligations.
- Do not create unsolicited speech submissions or test with another person's voice.

## License notice

The repository is publicly visible but has **no general source-code license**. Publication alone does not convey permission to redistribute, sublicense, or commercially reuse its implementation. Contributed speech data has a separate, explicitly accepted CC0 1.0 dedication. Contact the owner to discuss source licensing.
