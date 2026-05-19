# Backend API

The HTTP surface of the Laravel app. **All meaningful routes live in `routes/web.php`** (despite the `/api/` prefix on many). `routes/api.php` is essentially empty (one trivial `auth:api` endpoint that nothing uses).

## Middleware Reference

| Name (as registered) | Class | Gate |
|---|---|---|
| `auth` | Laravel default `Authenticate` | Session-authenticated user must exist |
| `guest` | `RedirectIfAuthenticated` | Inverse — only for logged-out visitors |
| `admin` | `AdminMiddleware` | `Auth::user()->permissions === User::TYPE_ADMIN` (= 2) |
| `confirmed_user` | `ConfirmedTournamentUser` | `Auth::user()->isConfirmed($tournamentId)` — UTL exists and role > `not_confirmed` |
| `tournament_admin` | `TournamentAdmin` | Delegates to `EnsureTournamentAdmin::validate(...)` — UTL has `admin` role on the tournament |
| `tournament_manager` | `TournamentManager` | UTL exists and `hasManagerPermissions()` (role ≥ `manager`) |
| `pre_tournament_bets_closed` | `PreTournamentBetsClosedMiddleware` | Defined but **not used in routes** — guards endpoints that should be off-limits while pre-tournament bets are open |

Mapping `web → middleware alias` is in `app/Http/Kernel.php` (`$routeMiddleware` array).

## Route Catalogue

All paths are in `routes/web.php`. Read top-to-bottom — the file is short enough to follow.

### Auth

| Method | Path | Controller@method | Middleware | Notes |
|---|---|---|---|---|
| `Auth::routes()` | `/login`, `/register`, `/password/*`, etc. | Laravel scaffolding | — | Standard Laravel auth scaffolding |
| GET | `/logout` | `LoginController@logout` | — | |
| POST | `/send-reset-password` | `CustomResetPasswordController@submitForgetPasswordForm` | — | Sends reset link via SMTP |
| GET | `/reset-password/${token}` | `CustomResetPasswordController@resetPasswordUsingToken` | — | **Note** the literal `${token}` in the path — that's the route param syntax used here |
| GET | `/welcome` | inline closure | `guest` | Welcome page (Blade) |
| GET | `/set-password` | `UserController@showSetPassword` | — | View for initial password setup |
| PUT | `/api/user/set-password` | `UserController@setPassword` | `auth` (implicit via SPA) | Change password |

### Home / SPA Glue

| Method | Path | Controller@method | Middleware |
|---|---|---|---|
| POST | `/register-token` | `HomeController@registerFCMToken` | `auth` |
| GET | `/terms` | `HomeController@showTerms` | `auth` |
| GET | `/articles` | `HomeController@showArticles` | `auth` |
| POST | `/summary-msg-seen` | `HomeController@summaryMessageSeen` | `auth` |
| GET | * (fallback) | inline → `view('react-app.index')` | `auth` | SPA fallback |

### User

| Method | Path | Controller@method | Middleware |
|---|---|---|---|
| GET | `/api/user` | `UserController@getUser` | — |
| PUT | `/api/user` | `UserController@updateUser` | — |
| GET | `/api/user/utls` | `UserController@getUserUTLs` | — |
| GET | `/api/user/notifications` | `UserController@getMissingOpenBets` | — |
| POST | `/api/user/utls` | `UserController@joinTournament` | — |
| DELETE | `/api/user/utls/{tournamentId}` | `UserController@leaveTournament` | — |
| PUT | `/api/user/utls/{tournamentId}` | `UserController@updateUTL` | — |
| POST | `/api/user/utls/{tournamentId}/import-bets` | `UserController@importUtlBets` | — |
| GET | `/api/user/tournaments` | `UserController@getOwnedTournaments` | — |
| GET | `/api/users/` | `UserController@index` | `admin` |
| PUT | `/api/users/{userId}` | `UserController@update` | `admin` |

> Note: most `/api/user*` routes carry no explicit middleware in `routes/web.php` — they rely on the global `web` middleware group (sessions + CSRF) and the SPA being served only to authenticated users. Touching one of these from outside the SPA still requires a valid session.

### Tournament Management

| Method | Path | Controller@method | Middleware |
|---|---|---|---|
| POST | `/api/tournaments` | `TournamentController@createTournament` | — (auth implicit) |
| PUT | `/api/tournaments/{id}/prizes` | `TournamentController@updateTournamentPrizes` | — |
| PUT | `/api/tournaments/{id}/scores` | `TournamentController@updateTournamentScores` | — |
| PUT | `/api/tournaments/{id}/preferences` | `TournamentController@updateTournamentPreferences` | — |
| GET | `/api/tournament-name/{code}` | `TournamentController@getTournamentName` | `auth` |
| GET | `/api/competitions` | `CompetitionController@index` | — |

### Per-Tournament API (prefix `/api/tournaments/{tournamentId}/`, middleware `confirmed_user`)

| Method | Path | Controller@method | Notes |
|---|---|---|---|
| GET | `bets` | `BetsController@index` | All of caller's bets |
| POST | `bets` | `BetsController@submitBets` | Submit/update bets (game, group rank, special) |
| GET | `bets/games` | `BetsController@visibleGameBets` | Filterable by `utl_ids` or `game_ids` |
| GET | `bets/primal` | `BetsController@visiblePrimalBets` | Group rank + special bets |
| GET | `groups` | `GroupsController@index` | |
| GET | `games` | `GamesController@index` | |
| GET | `goals` | `GamesController@getGoalsData` | |
| GET | `players` | `PlayersController@index` | |
| GET | `players/relevant` | `PlayersController@getRelevantPlayers` | |
| GET | `players/playing-live` | `PlayersController@getPlayersPlayingLive` | |
| GET | `leaderboardVersions` | `LeaderboardController@index` | List of versions for tournament |
| GET | `leaderboards` | `LeaderboardController@getLeaderboards` | Fetch specific versions (defaults to latest) |
| GET | `contestants` | `UserController@getTournamentUTLs` | Other competing UTLs |
| GET | `teams` | `TeamsController@index` | |
| GET | `special-questions` | `SpecialQuestionsController@index` | |
| GET | `notifications` | `InAppNotificationsController@getNotifications` | Nihus grants for this UTL |
| POST | `notifications/seen` | `InAppNotificationsController@seenNotification` | |
| GET | `nihusim` | `NihusimController@getTournamentNihusim` | All nihusim relevant to caller |
| GET | `nihusim/gifs` | `NihusimController@getNihusGifs` | Available GIF library |
| GET | `nihusim/sent` | `NihusimController@getNihusimSent` | Caller's outbox |
| POST | `nihusim` | `NihusimController@sendNihus` | Send a nihus |
| POST | `nihusim/seen` | `NihusimController@seenNihus` | Mark inbox seen |

### Per-Tournament Manager (added prefix `manage/utls`, middleware `tournament_manager`)

| Method | Path | Controller@method |
|---|---|---|
| GET | `/api/tournaments/{tournamentId}/manage/utls/` | `TournamentUserController@index` |
| PUT | `/api/tournaments/{tournamentId}/manage/utls/{utlId}` | `TournamentUserController@update` |
| DELETE | `/api/tournaments/{tournamentId}/manage/utls/{utlId}` | `TournamentUserController@delete` |

### Per-Tournament Admin block (commented out)

```php
Route::prefix("admin")->middleware("tournament_admin")
->group(function () {
    // Route::get("/config", [TournamentController::class, 'index']);
    // Route::post("/config", [TournamentController::class, 'update']);
});
```

The `tournament_admin` middleware exists and is wired here, but no routes are currently registered inside the block. Use this as the place to add tournament-admin-scoped endpoints.

### Admin (no prefix grouping; one-off `/admin/*` routes)

All under `admin` middleware *only if* it was added — most of these routes have **no explicit middleware** in `routes/web.php` and rely on either the global `web` group or in-controller auth checks. See GOTCHAS.md.

| Method | Path | Controller@method | Notes |
|---|---|---|---|
| POST | `/admin/grant-tournament-admin` | `AdminController@grantTournamentAdminPermission` | |
| GET | `/admin/users-to-confirm` | `AdminController@showUsersToConfirm` | name `users-to-confirm` |
| POST | `/admin/set-permission` | `AdminController@setPermission` | site-wide permission level |
| GET | `/admin/calc-special-bets` | `AdminController@calculateSpecialBets` | **METHOD DOES NOT EXIST in `AdminController.php` — calling this route 500s.** See GOTCHAS.md |
| GET | `/admin/calc-special-bet/{name}` | `AdminController@calculateSpecialBet` | **METHOD DOES NOT EXIST — same as above** |
| PUT | `/admin/reset-user-pass/{id}` | `AdminController@resetPass` | |
| PUT | `/admin/format-custom-answers` | `AdminController@formatSpecialBetsCustomAnswer` | |
| POST | `/admin/create-rank-row` | `AdminController@createNewRankingRow` | Legacy `Ranks` |
| POST | `/admin/update-last-rank-row` | `AdminController@updateLastRankingRow` | Legacy `Ranks` |
| POST | `/admin/delete-last-rank-row` | `AdminController@removeLastRankingRow` | Legacy `Ranks` |
| GET | `/admin/running-tournaments-data` | `AdminController@getRunningTournamentsData` | Dashboard data |
| GET | `/admin/fill-monkey-missing-game-bets` | `AdminController@FillMissingMonkeyGameBets` | Auto-bet for monkeys |
| POST | `/admin/announce-mvp` | `AdminController@announceMVP` | Triggers `CalculateSpecialBets` |
| POST | `/admin/set-game-goals-data` | `AdminController@setGameGoalsData` | |
| POST | `/admin/update-scorers-from-goals-data` | `AdminController@UpdatePlayerFromGoalsData` | Rescores top-scorer + most-assists |
| GET | `/admin/decomplete-match/{id}` | `AdminController@removeMatchResult` | Reverts a game's result |
| GET | `/admin/complete-match/{id}/{scoreHome?}/{scoreAway?}/{isAwayWinner?}` | `AdminController@completeMatch` | **Key endpoint** — triggers `UpdateGameBets` + leaderboard cascade |
| GET | `/admin/switch-bet-match/{fromMatchID}/{toMatchID}` | `AdminController@switchBetMatchIDs` | Rewire bets |
| GET | `/admin/flip-bets/{matchId}/{userId?}` | `AdminController@flipMatchBet` (static) | Swap home/away scores in bets |
| GET | `/admin/danger-switch-groups/{external_id_a}/{external_id_b}` | `AdminController@switchGroups` (static) | **DANGEROUS** — see ADMIN_OPERATIONS.md |
| GET | `/admin/delete-match/{matchId}` | `AdminController@deleteMatch` | |
| GET | `/admin/calculate-group-ranks` | `AdminController@calculateGroupRanks` | |
| POST | `/admin/user-set-name` | `AdminController@setNametoUser` | |
| DELETE | `/admin/delete-user` | `AdminController@deleteUser` | |
| POST | `/admin/create-monkey-user` | `AdminController@createMonkey` | |
| POST | `/admin/update-side-tournament-games` | `AdminController@updateSideTournamentGames` | |
| POST | `/admin/nihusim` | `AdminController@grantNihusim` | Grant nihus quota |
| POST | `/admin/fix-games-start-time/{tournamentId}` | `AdminController@markCompetitionAsShouldUpdateGames` | Triggers re-sync |
| GET | `/notifications/send` | `AdminController@sendAll` | **METHOD DOES NOT EXIST — 500s** |

> See ADMIN_OPERATIONS.md for what each of these does in practice and recovery paths when something goes wrong.

### Debug (admin-only by convention, NOT enforced by middleware)

| Method | Path | Controller@method |
|---|---|---|
| GET | `/debug/get-table-ids/{name}` | `DebugController@getTableIds` |
| GET | `/debug/get-full-table/{name}` | `DebugController@getFullTable` |
| GET | `/debug/scorers-simple-data` | `DebugController@getScorersIntuitiveData` |
| GET | `/debug/special-bets-values/{name}` | `DebugController@getSpecialBetsData` |

`DebugController` enforces admin in its `__construct()` — see the controller for the actual gate.

## Controller Method Index

Beyond what's listed above (routes that map to a method), some controller methods aren't reachable via HTTP but exist for internal use or are dead code:

- `AdminController::sendGlobalNotification`, `showConfirmedUsers`, `showTools`, `removeFlaggedOffSpeicalQuestionBets`, `setPassword` (the admin-only variant) — defined, **not wired to a route**.
- `BetsController::validateCredentials` — internal helper.
- `UserController::validateCanEditScoreInput`, `validateNewPermissions` — internal validators.

## Key Endpoint Notes

### `BetsController::submitBets` (POST `bets`)
The fattest endpoint on the system. Accepts a batch:

```jsonc
{
  "bets": [
    {"type": 1, "data": {"game_id": 1234, "result-home": 2, "result-away": 1, "winner_side": "home"}},
    {"type": 2, "data": {"group_id": 5, "0": 11, "1": 12, "2": 13, "3": 14}},
    {"type": 3, "data": {"special_question_id": 7, "answer": 99}}
  ],
  "fillTournaments": [12, 13]   // optional — copy these bets into other tournaments the user owns/competes in
}
```

Two-legged ties get auto-paired (a first-leg bet generates the second-leg bet's qualifier automatically). See `validateBatch()` and GOTCHAS.md.

### `AdminController::completeMatch`
The trigger for the entire scoring → leaderboard cascade. Path: `/admin/complete-match/{id}/{scoreHome?}/{scoreAway?}/{isAwayWinner?}`. After updating the `Game`, it calls:
1. `UpdateGameBets` — score each match bet
2. `UpdateLeaderboards` — build/refresh per-game `LeaderboardsVersion` snapshots
3. `CalculateSpecialBets` — re-score special bets if their answer is known

See `LEADERBOARD_FLOW.md`.

### Live leaderboard polling
There's no WebSocket. The SPA polls `/api/tournaments/{id}/leaderboards` and `/games` via `useLiveUpdate` (see FRONTEND.md).

## Adding a New Endpoint

See `RECIPES.md` (`How to add a new API endpoint`).
