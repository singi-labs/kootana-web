<div align="center">

# Kootana Web

**The marketing landing page for Kootana ([kootana.social](https://kootana.social)).**

[![Status: Incubating](https://img.shields.io/badge/status-incubating-orange)]()

</div>

---

## Overview

This repo holds the Kootana marketing site: a single landing page that explains
the product and routes visitors to the app. There is no login and no app
functionality here. Kootana is app-first, so the product itself lives in
[kootana-app](https://github.com/singi-labs/kootana-app).

Kootana is a [Singi Labs](https://singi.dev) product for cross-event networking
and a verifiable track record on the AT Protocol, a sibling to
[Sifa](https://sifa.id) and Barazo.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Astro (static output) |
| Styling | `tokens/kootana.css` design tokens + scoped component CSS |
| Fonts | Sora (display) + Public Sans (body), self-hosted via Fontsource |
| Waitlist | Netlify Function proxy to self-hosted Listmonk (double opt-in) |
| Spam protection | ALTCHA proof-of-work (`altcha-lib`) |
| Hosting | Netlify |

---

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # static build to dist/
npm run typecheck  # tsc over functions + icons
```

The waitlist form posts to `/.netlify/functions/newsletter-subscribe`, which is
only available when running under Netlify (`netlify dev`) or once deployed. The
page itself renders fine with `npm run dev`; the form needs the functions + env
vars below.

---

## Deploy (Netlify)

Static build (`dist/`) plus the serverless functions in `netlify/functions/`.
GitHub Pages can't run the functions, so this site is on Netlify.

Required environment variables (see `.env.example`, set them in the Netlify UI):

| Variable | Purpose |
|----------|---------|
| `LISTMONK_API_USER` / `LISTMONK_API_KEY` | Listmonk API auth |
| `CF_BYPASS_TOKEN` | Cloudflare bypass for `n.a11y.nl` |
| `ALTCHA_HMAC_KEY` | Signs/verifies ALTCHA challenges |

The waitlist writes to Listmonk list **8** (Kootana waitlist), double opt-in.

---

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [kootana-app](https://github.com/singi-labs/kootana-app) | Native mobile app (Expo/React Native) |

---

## License

Proprietary — private, incubating. License to be finalized before any public release.

---

(c) 2026 Singi Labs
