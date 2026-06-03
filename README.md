# Markdown to Redmine Textile

A browser-based Vue 3 application for converting Markdown into Redmine Textile.

The converter is based on the Positroid Markdown to Textile utility and extends it for Redmine workflows: fixed nested lists, Mermaid diagram exports, GitHub spoilers, and downloadable archives with generated diagram assets.

## Features

- Reactive Markdown to Redmine Textile conversion.
- Correct nested unordered and ordered list output.
- Inline code conversion to Redmine Textile `@code@`.
- Mermaid fenced blocks converted to attached image references.
- Zip export with:
  - `text.textile`
  - `diagram-1.png`, `diagram-2.png`, etc.
- Optional transparent PNG background for diagram files.
- SVG resource previews and full-size pan/zoom diagram viewer.
- GitHub `<details>/<summary>` spoiler support via Redmine `collapse`.
- Synced scroll between Markdown input and Textile output.
- Dark and light UI themes.

## Development

This project uses Yarn 4 via Corepack.

```bash
corepack enable
corepack yarn install
corepack yarn dev
```

Local app URL:

```text
http://localhost:5173/
```

## Scripts

```bash
corepack yarn build
corepack yarn test
corepack yarn test:e2e
```

Playwright tests require Chromium. If it is missing locally:

```bash
corepack yarn playwright install chromium
```

## GitHub Pages

The repository includes a GitHub Actions workflow that:

1. Installs dependencies with Yarn.
2. Runs typecheck/build, unit tests, and Playwright e2e tests.
3. Deploys `dist/` to the `gh-pages` branch on pushes to `main`.

In GitHub repository settings, configure Pages to serve from the `gh-pages` branch.

## License

MIT
