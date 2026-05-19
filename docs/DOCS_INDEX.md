# LigaBet Reference Documentation — Index

This is the entry point to the reference docs at the repo root. Each doc is standalone; cross-references are explicit.

## All Documents

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system shape: Laravel API + React SPA, hybrid serving, request lifecycle. |
| [DOMAIN_MODEL.md](DOMAIN_MODEL.md) | Glossary of every domain concept (Tournament, UTL, Bet, SpecialBet, Leaderboard, Nihus, Monkey, …) and the lifecycle states. |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Every table with columns, indexes, FKs. Mermaid ER diagram. Schema-evolution timeline. |
| [BACKEND_API.md](BACKEND_API.md) | Every HTTP route grouped by domain, middleware reference, controller method index. |
| [BACKEND_INTERNALS.md](BACKEND_INTERNALS.md) | Eloquent models, Actions (command pattern), Enums, notifications. |
| [BET_SCORING.md](BET_SCORING.md) | Deep dive on the three bet types, scoring formulas, full `config.scores.*` schema. |
| [LEADERBOARD_FLOW.md](LEADERBOARD_FLOW.md) | End-to-end flow from match completion → leaderboard snapshot. Side tournaments. Legacy `Ranks`. |
| [AUTH_AND_PERMISSIONS.md](AUTH_AND_PERMISSIONS.md) | User permission levels, UTL roles, middleware, registration/login/reset/FCM. |
| [FRONTEND.md](FRONTEND.md) | React/Redux stack, entry chain, routes, layout, feature folders, slices, API layer, RTL. |
| [CONFIG_AND_DEPLOYMENT.md](CONFIG_AND_DEPLOYMENT.md) | Config files, env vars, Procfile, two build systems, local-setup steps. |
| [ADMIN_OPERATIONS.md](ADMIN_OPERATIONS.md) | Catalogue of admin endpoints, including dangerous ops and recovery paths. |
| [RECIPES.md](RECIPES.md) | Step-by-step "how to add X" recipes for common change types. |
| [GOTCHAS.md](GOTCHAS.md) | Non-obvious behaviors, deprecated paths, edge cases. Read this before touching anything. |
| [WORLD_CUP_2026.md](WORLD_CUP_2026.md) | FWC 2026 format reference (48 teams, 12 groups, Round of 32, Annex C lookup) and integration notes for adding the tournament to the repo. |
| [FOOTBALL_API.md](FOOTBALL_API.md) | Football data API research: current sources (football-data.org + 365scores), live test against WC 2026 feed, free alternatives comparison, recommendation. |
| [HOSTING.md](HOSTING.md) | Hosting research: per-platform verdict (Vercel/Railway/Render/Fly/Heroku), free combos that actually exist in 2026, local setup steps. |

## Reading Guide — "I want to do X, read Y"

| Goal | Start here |
|------|------------|
| Get oriented quickly | ARCHITECTURE.md → DOMAIN_MODEL.md |
| Add or modify a bet type | BET_SCORING.md → RECIPES.md → BACKEND_INTERNALS.md → FRONTEND.md |
| Add a new SpecialBet sub-type (e.g. "most yellow cards") | BET_SCORING.md → RECIPES.md (`How to add a new SpecialBet sub-type`) → GOTCHAS.md (`specialQuestionFlags`) |
| Add an API endpoint | BACKEND_API.md → RECIPES.md (`How to add a new API endpoint`) → AUTH_AND_PERMISSIONS.md |
| Add a React route or page | FRONTEND.md → RECIPES.md (`How to add a new SPA route`) |
| Add a Redux slice | FRONTEND.md (state-management section) → RECIPES.md (`How to add a new Redux slice`) |
| Change tournament config schema | BET_SCORING.md (config.scores) → GOTCHAS.md (`Tournament status lock`) → RECIPES.md |
| Touch the database schema | DATABASE_SCHEMA.md → RECIPES.md (`How to add a new migration`) |
| Recover from an admin mishap | ADMIN_OPERATIONS.md (recovery paths in each entry) |
| Set up locally | CONFIG_AND_DEPLOYMENT.md (Local Setup section) |
| Diagnose a weird behavior | GOTCHAS.md first |
| Add the FIFA World Cup 2026 tournament | WORLD_CUP_2026.md → DATABASE_SCHEMA.md → BACKEND_INTERNALS.md (Actions) → FRONTEND.md |
| Pick a host or run locally | HOSTING.md → CONFIG_AND_DEPLOYMENT.md |

## Conventions

- **File:line references** look like `app/Bets/BetMatch/BetMatchRequest.php:134` and link to the method named in the surrounding text.
- **Mermaid diagrams** are inside ` ```mermaid ` fences. They render natively in GitHub, VS Code (with extension), and https://mermaid.live.
- **"UTL"** = `user_tournament_links` row = `App\TournamentUser` model. Used interchangeably.
- **"Game" vs "Match"** — the DB table is `matches`, the Eloquent model is `Game`. Used interchangeably in code; the docs prefer "Game" matching the model.
- **Hebrew strings** appear inline in some examples; they are user-facing and not translated.
- **`config.scores.*` paths** like `gameBets.groupStage.result` refer to nested keys in the JSON stored on `tournaments.config`. See BET_SCORING.md for the full schema.

## When Documentation Goes Stale

- `git log database/migrations/` will show schema changes since this doc was last touched.
- `git log app/Bets/` will show scoring-logic changes.
- `git log app/Http/Controllers/AdminController.php` will show admin-endpoint additions.
- Cross-check the route table in BACKEND_API.md against `routes/web.php` whenever endpoints are added.
