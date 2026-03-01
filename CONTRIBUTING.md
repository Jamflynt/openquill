# Contributing to OpenQuill

Thanks for your interest. OpenQuill is a small open-source project — contributions welcome.

## Reporting bugs

Open a GitHub Issue. Include:
- What you did
- What you expected
- What actually happened
- Browser / OS if it's a UI bug

## Submitting pull requests

1. Fork the repo and create a branch from `main`
2. Branch naming: `fix/short-description` or `feature/short-description`
3. Make your changes, keeping scope narrow
4. Open a PR with a clear title and a short description of what changed and why

For non-trivial changes, open an Issue first so we can discuss the approach before you build it.

## Areas that need help

- **PDF upload** — the parsing infrastructure exists (`/api/statements/parse`) but file upload is not wired up. This is a good first contribution if you're comfortable with Next.js API routes.
- **Transaction editing** — bulk edits, category reassignment across multiple transactions
- **Export** — CSV export of transactions is commonly requested
- **Mobile polish** — the app is PWA-capable but hasn't been tested exhaustively on all devices

## What's out of scope for v1

- Real-time bank sync (this requires credentials — intentionally excluded)
- Bill pay or scheduled payments
- Investment tracking
- Multi-currency support

## Code style

- TypeScript strict mode
- Tailwind v4 with CSS custom properties (no raw hex values — use `var(--quill-*)` tokens)
- Server components by default; `'use client'` only where state or browser APIs are needed
- Zod validation on all API route inputs
- No new dependencies without a strong reason

## Questions

Open an Issue or start a Discussion on GitHub.
