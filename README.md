# Training

Personal progressive-training PWA: push-ups, pull-ups, and any other rep- or seconds-based
exercise. Local-only data, works offline, installs to the iPhone home screen from Safari.
Design details in [SPEC.md](SPEC.md).

## Develop

```sh
npm install
npm run dev        # dev server
npm test           # unit tests (generator parity, scheduler)
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Icons: `sh scripts/make-icons.sh` (requires ImageMagick).

## Deploy (GitHub Pages)

One-time setup:

1. Create a GitHub repo and push this project to `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.

Every push to `main` then builds, tests and deploys via
`.github/workflows/deploy.yml`. The app lands at
`https://<user>.github.io/<repo>/`.

## Install on iPhone

1. Open the deployed URL in **Safari**.
2. Share → **Add to Home Screen**.
3. Launch from the icon — it runs standalone and offline.

## Data & backup

Everything lives in `localStorage` on the device. iOS can evict web-app storage
after weeks of disuse — export a backup from Settings once in a while (JSON file,
re-importable on any device).
