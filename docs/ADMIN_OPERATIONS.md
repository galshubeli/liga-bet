# Admin Operations

Field guide to the `/admin/*` and `/notifications/*` endpoints in `AdminController`. Most are "do something fragile to live tournament state" — use carefully. The site-wide admin gate (`User::TYPE_ADMIN`) is enforced **inconsistently**; some endpoints check in-controller, some don't, and a few are wide open in `routes/web.php`. Lock down at the proxy / firewall if you care.

## Quick Index

| Group | Endpoints |
|---|---|
| Users & permissions | confirm users, set permission, set name, reset password, delete user, create monkey, grant tournament admin |
| Match management | complete / decomplete / delete match, switch bet match IDs, flip bets, switch groups (**DANGER**), fix start times |
| Special bets & scoring | announce MVP, set game goals data, update scorers from goals, format custom answers |
| Group rankings (legacy) | calculate group ranks, create / update / delete ranking row |
| Tournament setup | update side-tournament games, get running-tournaments data, fill missing monkey bets |
| Nihusim / notifications | grant nihusim, send-all FCM notifications |

## Users & Permissions

### `GET /admin/users-to-confirm` (`showUsersToConfirm`)
Returns the list of users awaiting confirmation. Read-only dashboard view.

### `POST /admin/set-permission` (`setPermission`)
Body: `{user_id, permission}` where `permission` ∈ `[TYPE_TOURNAMENT_ADMIN, TYPE_USER, TYPE_ADMIN]` (i.e. `[1, 0, 2]`). Sets the site-wide `User.permissions`.

- Rejects if `user_id == current admin id` (no self-edit).
- **`TYPE_MONKEY` is not in the allowlist** — use `POST /admin/create-monkey-user` to create a monkey instead.

### `POST /admin/grant-tournament-admin` (`grantTournamentAdminPermission`)
Promotes the target user to `TYPE_TOURNAMENT_ADMIN`. Distinct from `setPermission` (which can set any allowlisted value).

### `POST /admin/user-set-name` (`setNametoUser`)
Forces a display name on a user. Useful for cleanup.

### `PUT /admin/reset-user-pass/{id}` (`resetPass`)
Admin password reset. Generates a new password.

### `DELETE /admin/delete-user` (`deleteUser`)
Removes a user. Be aware: bets reference UTL, which references user — there are no DB cascades, so orphan UTLs/bets are possible if cleanup isn't thorough. Read the source before relying on this.

### `POST /admin/create-monkey-user` (`createMonkey`)
Creates a monkey user (`TYPE_MONKEY`). Used for demos and testing.

## Match Management

### `GET /admin/complete-match/{id}/{scoreHome?}/{scoreAway?}/{isAwayWinner?}` (`completeMatch`)

**The most important admin endpoint.** Completes a match and triggers the full scoring + leaderboard cascade.

- Knockout games with a tied score **require** `isAwayWinner` (truthy → away advances, falsy → home advances).
- Internally:
  1. Saves `result_home`, `result_away`, `ko_winner` via `UpdateGameBets::handle($game, ...)`
  2. Scores every match bet for that game (`bet.score = BetMatchRequest.calculate()`)
  3. Calls `UpdateLeaderboards::handle($game->competition, $game->id)` which snapshots a `LeaderboardsVersion` for every done game ≥ this game ID, across every tournament in the competition.
- Repeatable — re-completing a match overwrites its bet scores and refreshes leaderboard versions from there forward.

**Recovery if wrong scores were submitted:** call `/admin/decomplete-match/{id}` first, then re-`/admin/complete-match/...` with correct scores. The leaderboard rebuilds itself.

### `GET /admin/decomplete-match/{id}` (`removeMatchResult`)
Reverts a game: clears `result_home`/`result_away`/`ko_winner` and calls `Game::decompleteBets()`. **Does not** rebuild leaderboards — you typically follow up with `complete-match` again.

### `GET /admin/delete-match/{matchId}` (`deleteMatch`)
Hard delete a game **and all its match bets**. Leaderboard versions tied to this game aren't auto-cleaned. Avoid unless the game shouldn't have existed.

### `GET /admin/switch-bet-match/{fromMatchID}/{toMatchID}` (`switchBetMatchIDs`)
Rewires every match bet from `fromMatchID` to `toMatchID`. Useful when external IDs collide or you imported the wrong game.

### `GET /admin/flip-bets/{matchId}/{userId?}` (`flipMatchBet`)
Swaps `result-home` ↔ `result-away` on every match bet for the given game (or just the given user). **Has a latent bug** — references `$bet->user` and `$bet->user_id` which no longer exist post the 2022 UTL refactor. Confirm before relying on this.

### `GET /admin/danger-switch-groups/{external_id_a}/{external_id_b}` (`switchGroups`)

**DANGEROUS.** Swaps the team→group assignment for two groups (by their `external_id`s) AND swaps every existing `BetTypes::GroupsRank` bet between the two groups so users' predictions follow the correct group.

- The real-life standings are **not** swapped — only metadata and bets.
- Outputs HTML with a play-by-play of the changes.
- Like `flipMatchBet`, this references `$bet->user_id` which is post-refactor non-existent. **Confirm before using.**
- Use only when the external data source mis-assigned a group at import time.

### `POST /admin/fix-games-start-time/{tournamentId}` (`markCompetitionAsShouldUpdateGames`)
Marks the competition as needing a fresh sync of game start times. Next `UpdateCompetition` run will refetch.

## Special Bets & Scoring

### `POST /admin/announce-mvp` (`announceMVP`)
Body: `{competition_id, player_id}`. Wraps `CalculateSpecialBets::execute($competitionId, SpecialBet::TYPE_MVP, $playerId, !$playerId)` — sets the MVP answer across all tournaments under the competition and rescores all MVP bets.

### `POST /admin/set-game-goals-data` (`setGameGoalsData`)
Stores per-player goal/assist data for a game into `game_data_goals`. Use after a game finishes to record who scored/assisted.

### `POST /admin/update-scorers-from-goals-data` (`UpdatePlayerFromGoalsData`)
Aggregates `game_data_goals` rows into per-player `goals` and `assists` totals on the `players` table. Then runs:
- `CalculateSpecialBets::execute($competition->id, SpecialBet::TYPE_TOP_SCORER, $answer)`
- `CalculateSpecialBets::execute($competition->id, SpecialBet::TYPE_MOST_ASSISTS, $answer)`

So top-scorer and most-assists special bets get fresh scores.

### `PUT /admin/format-custom-answers` (`formatSpecialBetsCustomAnswer`)
Body: `{from_name, to_name}`. Bulk-rewrites bet answers from `from_name` → `to_name` for MVP and Most-Assists special bets. Useful when player names came in inconsistently from the external API.

### `GET /admin/calc-special-bets` / `GET /admin/calc-special-bet/{name}`
**Routes exist but the corresponding controller methods (`calculateSpecialBets`, `calculateSpecialBet`) DO NOT exist** — these endpoints will throw a method-not-found error. See GOTCHAS.md.

## Group Rankings (Legacy `Ranks`)

These touch the deprecated `ranks` table, which predates `LeaderboardsVersion`. New features should use the modern leaderboard tables instead.

### `POST /admin/create-rank-row` (`createNewRankingRow`) → `Ranks::updateRanks()`
### `POST /admin/update-last-rank-row` (`updateLastRankingRow`) → `Ranks::updateLastRank()`
### `POST /admin/delete-last-rank-row` (`removeLastRankingRow`) → `Ranks::removeLastRank()`

### `GET /admin/calculate-group-ranks` (`calculateGroupRanks`)
Loops every `Group` and calls `Group::calculateBets()` — rescores all `BetTypes::GroupsRank` bets. Idempotent; safe to re-run.

## Tournament Setup

### `POST /admin/update-side-tournament-games` (`updateSideTournamentGames`)
Updates `tournament.config.sideTournamentGames` — the map from game ID → array of side-tournament IDs that should be updated when this game finishes. See LEADERBOARD_FLOW.md (side tournaments section).

### `GET /admin/running-tournaments-data` (`getRunningTournamentsData`)
Returns a dashboard summary of all running tournaments with their contestants. Read-only.

### `GET /admin/fill-monkey-missing-game-bets` (`FillMissingMonkeyGameBets`)
For every monkey user, auto-generates bets on games they haven't bet on yet. Uses `MonkeyAutoBetCompetitionGames`.

## Nihusim / Notifications

### `POST /admin/nihusim` (`grantNihusim`)
Body: `{user_tournament_id, amount, grant_reason}`. Adds a `NihusGrant` row giving a UTL more nihusim quota.

### `GET /notifications/send` (`sendAll`)
**Route exists, method DOES NOT exist** — won't work via HTTP. The intended trigger for `SendCloseCallsMatchBetsNotifications` (FCM push reminder of upcoming games without bets). Either wire it up in a Console command or fix the missing method.

## Debug Routes (`/debug/*`)

Provided by `DebugController` (which gates admin in its `__construct()`):

- `GET /debug/get-table-ids/{name}` — list IDs in a table
- `GET /debug/get-full-table/{name}` — dump a table
- `GET /debug/scorers-simple-data` — quick view of scorer aggregates
- `GET /debug/special-bets-values/{name}` — inspect special-bet values

Useful for triage. Not safe to expose to non-admins.

## Operational Recipes

### "I accidentally completed a match with the wrong score"
1. `GET /admin/decomplete-match/{id}`
2. `GET /admin/complete-match/{id}/{rightHome}/{rightAway}/{isAwayWinner?}`

Leaderboard versions rebuild themselves from this game forward — no manual ranks fix needed.

### "MVP was decided"
`POST /admin/announce-mvp` with the player_id. Rescores all MVP bets across every tournament in the competition. The leaderboard picks up the new scores on its next rebuild.

### "Top scorer rankings shifted"
1. Make sure `game_data_goals` is up to date for the recent games — `POST /admin/set-game-goals-data` for each game.
2. `POST /admin/update-scorers-from-goals-data` — aggregates and rescores top-scorer + most-assists special bets.

### "I want to demo the app with fake users"
1. Create a tournament.
2. For each fake user: `POST /admin/create-monkey-user`.
3. After every game-bet open: `GET /admin/fill-monkey-missing-game-bets` to populate predictions.

### "Two groups got mis-imported"
1. **First, snapshot the DB.** This is the most destructive endpoint in the app.
2. `GET /admin/danger-switch-groups/{ext_a}/{ext_b}` — swaps team assignments AND bets.
3. Verify standings and bets afterwards.

### "Someone's account is locked / wrong password"
`PUT /admin/reset-user-pass/{id}` — admin resets the password.

### "A bet is on the wrong match"
`GET /admin/switch-bet-match/{from}/{to}` — moves all match bets from one game to another.

## Caveats

- Many endpoints `echo` instead of returning JSON — they're meant for browser visits, not API calls.
- A few endpoints (`flipMatchBet`, `switchGroups`, `formatSpecialBetsCustomAnswer`) reference the old `bet->user_id` / `bet->user` properties that were dropped in the 2022 UTL refactor. **Sanity-check before relying on them.**
- There is no audit log for admin actions. If you need traceability, log manually before / after.
- No rate limiting on admin routes — they're under the `web` middleware group (sessions + CSRF) but not under `throttle:60,1`.
