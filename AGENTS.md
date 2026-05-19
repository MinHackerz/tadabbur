# AGENTS

## Purpose
This repo is an AI-friendly starter for Quran Foundation SDK integrations. Keep changes small, explicit, and easy to review.

## Reference Policy
- Reader, goals, bookmarks, collections, and Quran UX semantics should align with `quran.com-frontend-next`.
- Reflection/feed/profile semantics should align with `quranreflect-frontend-next`.
- Port behavior, not architectural baggage. Keep this codebase simpler than the reference apps.

## Engineering Rules
- Prefer server-side SDK calls through `/api/*` route handlers.
- Never expose `CLIENT_SECRET`, refresh tokens, or user access tokens to the browser.
- Keep browser state local and lightweight; avoid large global state frameworks.
- Use early returns, clear naming, and direct control flow.
- Keep each feature understandable without jumping through many files.

## Auth Model
- User actions (notes/bookmarks/collections/goals/reflections) are user-session token paths.
- Content/search are app-token paths (`client_credentials`) and must remain independent.
- Logout must use OIDC end-session, not only local session destruction.

## Testing Expectations
- For a bug fix, add or update a test that reproduces it first.
- Run `npm run lint`, `npm run build`, and `npm test` before finalizing.
- Use `npm run smoke:routes` for route-level sanity checks.
