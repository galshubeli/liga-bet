# Gotchas

Non-obvious behaviors, deprecated paths, edge cases, and outright bugs. **Read this before making changes.**

Items are grouped by category.

## Data Model

### UTL indirection — bets never reference users directly
`bets.user_tournament_id` points at a `user_tournament_links` (UTL) row, not at a `users` row. The 2022 tournaments refactor (`2022_07_09_204357_create_turnaments_feature.php`) dropped `bets.user_id` and replaced it with `tournament_id` + `user_tournament_id`. Code that references `$bet->user` or `$bet->user_id` is **pre-refactor and broken** — see `AdminController::flipMatchBet`, `switchGroups`, and `formatSpecialBetsCustomAnswer`.

**How to apply:** Always go through `$bet->utl->user`. Treat any direct `$bet->user_id` reference as a bug.

### One UTL per (user, tournament) — not enforced by the DB
`user_tournament_links` has no unique constraint on `(user_id, tournament_id)`. The invariant is held by application code (`User::getTournamentUser()` and `Tournament::createUTL` check first).

### `tournaments.code` IS unique (added in `2022_08_20_172946`)
Two tournaments can never share a join code — `Tournament::createTournament` retries on collision.

### Schema FKs without DB constraints
Most `foreignId(...)` columns have no DB-level FK constraint. Deletes don't cascade. Orphan rows are possible. Cleanup is the app's responsibility.

## Tournament Lifecycle

### Scoring config is locked once tournament is `STATUS_ONGOING`
`TournamentController::updateTournamentScores` rejects edits unless `$tournament->status === STATUS_INITIAL`. The error is surfaced as a JSON 4xx — silent only if you bypass the controller.

**How to apply:** Get the scoring right pre-start; afterwards, the only escape is a direct DB edit (and then `Tournament::updateToNumeralScoreConfig()` to coerce stringy values).

### `specialQuestionFlags` deletes existing bets when a tournament starts
`Tournament::start()` calls `deleteDeprecatedQuestionBets()`, which **deletes every existing special-bet bet whose question's flag is off**. So if a tournament admin disables a special question and then starts, users' answers vanish silently. Warn them.

### Tournament name uniqueness toggled on, then off
Migration `2022_10_29_214515` added a unique constraint on `tournaments.name`. Migration `2022_11_16_175219` removed it. Duplicate names are allowed today.

## Bet Engine

### Two-legged ties auto-pair bets across legs
`BetsController::submitBets` + `BetMatchRequest::validateDataTwoLeggedTie` allow the second leg's bet to have only a qualifier (auto-derived from leg 1's bet) or only a score (qualifier auto-derived from the actual leg-1 winner). The second-leg `winner_side` and `result-home`/`result-away` will appear partially-filled in `bets.data`.

### `winner_side` is only required for tied knockout scores
Plus, `scores.gameBets.knockout.qualifier > 0` must be true (i.e. the qualifier is worth points). If your scoring config zeros out the qualifier, the validator won't require `winner_side`.

### `SpecialBet.answer` can be a CSV
For ties (e.g. multiple top scorers). Code does `in_array($bet->answer, explode(',', $answer))`. Don't assume single-value.

### `TYPE_DEFENSIVE_TEAM` is partially implemented
`SpecialBet::TYPE_DEFENSIVE_TEAM` and `$typeToFlagName["defensive_team" => "defensiveTeam"]` exist. `BetSpecialBetsRequest` has `calculateDefensiveTeam()` and `calculateDefensiveTeamForGame()`. **But** `config/defaultScore.php` has **no** `specialBets.defensiveTeam` key and **no** `specialQuestionFlags.defensiveTeam` flag. So existing tournaments will score it as 0 and won't auto-create the question. You'd need to extend the default config to enable it.

### Group-rank "minor mistake" tolerance: max 2 mistakes, no team off by >1
`BetGroupRankRequest::calculate` — if any predicted team is more than 1 position off, returns 0. If 3+ teams are off by exactly 1, also returns 0. Otherwise: 0 mistakes → `perfect`, 1–2 → `minorMistake`.

### "BC fallback" on `topAssists.correct`
If `scores.specialBets.topAssists.correct` is missing, the code falls back to plain `scores.specialBets.topAssists`. Historical compatibility — don't rely on the fallback for new tournaments.

## Leaderboard

### Per-game incremental scoring is NOT stored on the bet
`TournamentUser::getBetsWithScoreGainedForGame` produces **replicated** bet objects with a synthetic `score` representing this game's contribution. They aren't saved. Only match-bet scores (computed by `BetMatchRequest::calculate`) are persisted on `bets.score`. Special-bet and group-rank per-game scores live in the `bet_score_override` JSON on each `Leaderboard` row.

### `bet_score_override` accumulates non-game-bet scores per bet
It's a JSON map `bet.id → cumulative score up to and including this version`. Used by the SPA to show per-bet score contributions without recomputing.

### Tied scores share rank
`UpdateLeaderboards::updateLeaderboardRows` assigns the same rank to all UTLs with identical scores (1, 1, 3, 4 — not 1, 2, 3, 4).

### Re-completing a past match cascades forward
`UpdateLeaderboards::updateRanks` walks games in chronological order, and from the trigger game forward it refreshes every done-game `LeaderboardsVersion`. So fixing a wrong score 5 games back rewrites the last 5 versions.

### `Ranks` is legacy
`app/Ranks.php` and the `ranks` table predate `LeaderboardsVersion`. Three admin endpoints still update it (`createNewRankingRow`, `updateLastRankingRow`, `removeLastRankingRow`) but reads should go through `LeaderboardsVersion`. **Don't build new features on `Ranks`.**

### `scorers` table is also legacy
Superseded by `players` + `game_data_goals`. Old code paths still touch it but new scoring code reads `players.goals` / `players.assists` (aggregated by `UpdatePlayerFromGoalsData`).

### Side tournaments filter by UTL list
`SideTournament.config.competingUtls` is an array of UTL IDs eligible for the side leaderboard. Only those UTLs get `Leaderboard` rows with that `side_tournament_id`. Set via `POST /admin/update-side-tournament-games`.

### When side-tournament leaderboards update
`Tournament.config.sideTournamentGames[gameId] = [sideTournamentId, ...]` controls **which** side tournaments are recomputed when a given game finishes. If the map doesn't list a side tournament for a game, its rows stay stale.

## Routes & Controllers

### `/api/*` lives in `routes/web.php`, not `routes/api.php`
This means all `/api/*` routes use the `web` middleware group (sessions + CSRF), not the `api` group's `throttle:60,1`. The actual `routes/api.php` has one trivial endpoint nobody uses.

### Admin routes have **inconsistent middleware**
A few admin endpoints declare `admin` middleware; many don't. Locking down at the proxy layer is wise.

### Routes that point at non-existent methods (will 500)
- `GET /admin/calc-special-bets` → `AdminController@calculateSpecialBets` (no such method)
- `GET /admin/calc-special-bet/{name}` → `AdminController@calculateSpecialBet` (no such method)
- `GET /notifications/send` → `AdminController@sendAll` (no such method)

`SendCloseCallsMatchBetsNotifications` (the FCM reminder notification) is therefore effectively orphaned — only reachable via direct console invocation.

### `flipMatchBet` and `switchGroups` reference `$bet->user_id` — broken
Both are static methods on `AdminController` left over from before the UTL refactor. They'll error on `$bet->user_id` not existing. **Test before relying on them.** Same for `formatSpecialBetsCustomAnswer` which iterates user IDs via a deprecated path.

### `setPermission` doesn't allow `TYPE_MONKEY`
The allowlist in `AdminController::setPermission` is `[TYPE_TOURNAMENT_ADMIN, TYPE_USER, TYPE_ADMIN]` — i.e. you can't demote a user to monkey via this endpoint. Use `POST /admin/create-monkey-user` instead (which makes a fresh monkey account).

### `setPermission` rejects self-edit
The currently authenticated admin can't change their own permissions. Logged-in user safety.

### `PreTournamentBetsClosedMiddleware` exists but isn't used
Defined in `app/Http/Middleware/PreTournamentBetsClosedMiddleware.php`, registered in `Kernel::routeMiddleware` as `pre_tournament_bets_closed`, but **no route uses it**. The logic also has a misspelling: `'Cannot see other users bets cefore tournament has started'` (sic).

### Most admin routes return text/HTML, not JSON
Many `echo` raw strings. They're designed for direct browser visits, not API consumers.

## Auth

### First user becomes admin
`RegisterController::create` checks `User::exists()` — if the table is empty, the new user is auto-promoted to `TYPE_ADMIN`. Be careful when seeding new environments.

### Password reset generates a NEW password, doesn't let the user choose
`CustomResetPasswordController::resetPasswordUsingToken` generates a random 10-char password, hashes it, logs the user in, and redirects to `/?reset-password`. The user is expected to immediately change it via `PUT /api/user/set-password`. Confusing UX if not flagged on the page.

### Reset tokens are reused within 10 minutes
If you click "send reset link" multiple times within 10 min, the same token gets re-sent. Token expiry: 60 min from creation.

### Min password length is 4
Yes, four characters. `'min:4'` in `RegisterController::validator`. Weak by modern standards.

### Tournament-admin grants are pre-registered emails, not invite codes
Add the email to `email_of_unregistered_tournament_admin` (via SQL — there's no admin UI). When that email registers, they auto-promote to `TYPE_TOURNAMENT_ADMIN` and the row is deleted.

### Max 3 tournaments per competition per user
`User::canJoinAnotherTournament` caps non-admins. Admins are exempt.

### FCM tokens rotate; client must re-register
`POST /register-token` must be called after every login. Stale tokens silently fail.

## Build & Runtime

### Two build systems coexist
- `frontend/webpack.config.js` — the active SPA build → `public/js/react-app/appMain.js`
- `webpack.mix.js` (root) — legacy Vue/jQuery → `public/js/app.js`, `public/css/app.css`

The Mix bundle is likely dead in production. Don't waste time updating it. The Blade template references the React bundle, not Mix output.

### No queue workers (`QUEUE_DRIVER=sync`)
Every "job" dispatched runs in-request. `completeMatch` is therefore synchronous and can take a while for big tournaments. Don't add long-running work without first switching the queue driver and starting a worker dyno.

### No cron / scheduled tasks
`app/Console/Kernel.php@schedule` is empty. `UpdateOngoingCompetitions` exists but only runs when invoked manually.

### Hardcoded Football-Data.org API tokens
`config/api.php` ships with two hardcoded `api_token` values. They're not loaded from env. Treat them as already leaked. Rotate if you fork.

### `.env.example` contains a real SMTP password
The SendinBlue password is committed in `.env.example`. Assume it's compromised; rotate before relying on it.

### Bundle analyzer pops up on every webpack build
`@webpack-bundle-analyzer/BundleAnalyzerPlugin` is in `frontend/webpack.config.js` without conditional gating — every `npm run dev` and `npm run build` opens a browser tab. Comment it out locally if it bugs you.

### Sentry source-map upload requires `SENTRY_AUTH_TOKEN`
`frontend/webpack.config.js` always calls `sentryWebpackPlugin`. If the env var is missing, the plugin will log a warning but the build still succeeds.

## Frontend

### Hardcoded Hebrew strings — no i18n layer
All user-facing text is inline Hebrew or in `frontend/src/strings/*.ts`. Adding English requires building a translation layer from scratch.

### Frontend uses jQuery's `$.ajax`
`frontend/src/api/common/apiRequest.ts` calls `window.$.ajax`. jQuery is loaded globally (via the Blade template's `<script src="/vendor/jquery/jquery.min.js">`). Don't remove the `$` global without replacing this wrapper.

### Frontend uses React Router **v5** (not v6)
The `<Switch>`/`<Route>` API differs from v6. When copying from internet examples, double-check the version.

### No frontend tests at all
ESLint config references `react-app/jest` but there are zero test files. Don't add a single test and then think CI runs — there is no CI.

### `Auth::routes()` adds `/home` but there's no `/home` route handler
`LoginController::$redirectTo = '/home'`, `RegisterController::$redirectTo = '/home'`. There is no actual `/home` route — visits hit the `Route::fallback` SPA view. Works fine but feels wrong.

### `useLiveUpdate` polls — no WebSockets
No real-time push. Polling intervals are coded in the hook.

## Typos and Misnamings (kept for grep-ability)

These mistakes are in the codebase — be aware so grep returns sensibly:

- `App\InvitaionsForTournamentAdmin` — should be "Invitations"
- `App\Actions\SavePleyerGameGoalsData` — should be "Player"
- `App\Group::fartStandings` — should be "firstStandings" probably
- `TournamentUser::getAvailabileNihusim` — should be "Available"
- "Specical" / "specicalQuestion" — sprinkled in a few admin method names like `removeFlaggedOffSpeicalQuestionBets`
- `CreateTurnamentsFeature` migration class — should be "Tournament"
- `'cefore'` in `PreTournamentBetsClosedMiddleware` error string — should be "before"

Don't fix them in a single PR — too many call sites; you'd break everything for cosmetic gain.

## Where to Look When Things Are Weird

| Symptom | Look at |
|---|---|
| Bet scoring is wrong | `app/Bets/{BetMatch,BetGroupsRank,BetSpecialBets}/*` + `tournament.config.scores` |
| Leaderboard out of date | `UpdateLeaderboards::updateRanks` — did `firstGameId` come from a synced game? |
| Side tournament leaderboard is stale | `tournament.config.sideTournamentGames[gameId]` — does it include the side tournament? |
| User can't bet | `Game::isOpenForBets()` (lock window?), `User::isConfirmed($tournamentId)` (UTL role?) |
| Special bet didn't score | `tournament.config.scores.specialQuestionFlags.{flag}` — is it on? Did `Tournament::start()` already run? |
| Admin endpoint 500s | Probably referencing `$bet->user_id` — see "non-existent methods" and "broken admin endpoints" above |
| FCM not arriving | `user.fcm_token` populated? Did the client re-register after login? |
| Login redirects loop | `LoginController::$redirectTo` and `Route::fallback` middleware (`auth`) — usually a session/cookie issue |
