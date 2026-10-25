# Magnexis Voice v1.25 — SEO

Public canonical host: https://magnexis-voice-commons.netlify.app/ (intended Netlify site, deployment not verified).

Version 1.25 adds canonical URLs, search descriptions, Open Graph/X sharing, SoftwareApplication and WebSite JSON-LD, a crawler-readable robots.txt and sitemap.xml, and indexable About, How It Works and Datasets informational pages.

The Netlify build copies tested local browser screenshots to static public image assets; screenshots use simulated API responses and do not establish live backend functionality.

## Production checks

1. Deploy to Netlify and confirm HTTP 200 for all four static pages, /robots.txt, /sitemap.xml and social image. No SSO wall may obstruct crawlers.
2. Verify all published absolute canonical URLs against the final domain and redirect alternate domains to it.
3. Verify JSON-LD in Schema.org Validator and sharing appearance on social platforms.
4. Verify the domain using Google Search Console, submit /sitemap.xml and use URL inspection. Consider Bing Webmaster Tools.
5. Monitor indexed pages, impressions and search referrals; indexing and rankings are not guaranteed.
6. Do not index preview deployments; do not expose account or audio APIs to crawlers.

Suggested informational search intents include community speech dataset, recording speech for research, and CC0 voice samples. Do not imply a released large corpus or Mozilla affiliation.
