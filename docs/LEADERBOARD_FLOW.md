# Leaderboard Flow

How a match result becomes points on someone's scoreboard. The most important runtime flow in the system.

## Overview

```mermaid
sequenceDiagram
    autonumber
    participant Admin
    participant Ctrl as AdminController.completeMatch
    participant UGB as UpdateGameBets
    participant ULB as UpdateLeaderboards
    participant Tournament as Tournament (model)
    participant DB

    Admin->>Ctrl: GET /admin/complete-match/{id}/{h}/{a}/{isAwayWinner?}
    Ctrl->>UGB: handle(game, h, a, isAwayWinner)
    UGB->>DB: Game.result_home/away/ko_winner = ..., save()
    loop each Bet on this game
        UGB->>DB: bet.score = BetMatchRequest.calculate(); save()
    end
    Ctrl->>ULB: handle(competition, firstGameId=game.id)
    loop each Tournament in competition
        ULB->>Tournament: getSortedGameIds()
        ULB->>ULB: walk games in order; from firstGameId, snapshot every done game
        loop each done game ≥ firstGameId
            ULB->>DB: upsert LeaderboardsVersion(game_id, tournament_id)
            ULB->>Tournament: getBetsScorePerUtlForGame(gameId, sideTournamentId=null)
            Tournament->>Tournament: per UTL: utl.getBetsWithScoreGainedForGame(game, null)
            ULB->>DB: upsert Leaderboard rows (rank, score, bet_score_override)
            opt side tournaments mapped to this game
                ULB->>DB: upsert side-tournament Leaderboard rows
            end
        end
    end
    Ctrl-->>Admin: 200 OK
```

The same `completeMatch` endpoint optionally triggers `CalculateSpecialBets` for time-sensitive answers (the MVP / top-scorer admin endpoints have their own routes — see ADMIN_OPERATIONS.md).

## Step 1 — Mark the match complete

`AdminController::completeMatch` (`/admin/complete-match/{id}/{h?}/{a?}/{isAwayWinner?}`) writes `result_home`/`result_away` and (for knockout games) `ko_winner` based on `isAwayWinner` for tiebreaks. Then it calls:

```php
$updateGameBets->handle($game, $scoreHome, $scoreAway, $isAwayWinner);
$updateLeaderboards->handle($game->competition, $game->id);
```

## Step 2 — `UpdateGameBets` scores match bets

`app/Actions/UpdateGameBets.php` iterates every `Bet` for the game and computes:

```php
$bet->score = (new BetMatchRequest($game, $bet->tournament, [...])).calculate();
$bet->save();
```

Group-rank bets and special-question bets are **not** touched here — their scoring is per-game-incremental and is pulled in at leaderboard-update time, not stored on the bet row.

## Step 3 — `UpdateLeaderboards` snapshots scoreboards

`app/Actions/UpdateLeaderboards.php`. For each tournament in the competition, it runs in a DB transaction:

### `updateRanks(Tournament, int $firstGameId)`

```
sortedGameIds = competition.getSortedGameIds()    # chronological
shouldUpdate = false
latestVersionGameId = null

for gameId in sortedGameIds:
    if gameId == firstGameId: shouldUpdate = true
    game = Game.find(gameId)
    if game.is_done:
        if shouldUpdate:
            updateVersion(tournament, gameId, latestVersionGameId)
        latestVersionGameId = gameId
```

So if game 17 was just completed, we create/update versions for game 17 **and every later already-done game** — important when admins backfill out-of-order or re-complete past games.

### `updateVersion(Tournament, int $gameId, ?int $prevGameId)`

1. Upsert a `LeaderboardsVersion` for `(tournament_id, game_id)`.
2. Call `updateLeaderboardRows(tournament, version, prevVersion, sideTournamentId=null)`.
3. For each `side_tournament_id` in `tournament.config.sideTournamentGames[gameId]`, call `updateLeaderboardRows(..., sideTournamentId)`.

### `updateLeaderboardRows(Tournament, LeaderboardsVersion, ?LeaderboardsVersion $prev, ?int $sideTournamentId)`

The interesting part:

```
prevByUtlId = prevVersion ? prev.leaderboards.where(side_tournament_id = $sid).keyBy(utl_id) : []

# For each competing UTL (or side-tournament's UTLs):
betsWithScoreGainedPerUtl = tournament.getBetsScorePerUtlForGame(game_id, $sid)
    # → for each UTL, the Collection<Bet> of bets that "gained score" from this game
    # (the matched Game bet for this game + any non-game bets credited for this game)

rows = betsWithScoreGainedPerUtl.map(function(bets, utlId) use (prevByUtlId):
    currentScore = bets.sum('score')
    prevScore    = prevByUtlId[utlId].score ?? 0
    primalBets   = bets.filter(type != BetTypes::Game).keyBy('id')

    return {
        score: currentScore + prevScore,
        utlId,
        bet_score_override: primalBets.map(function(bet) use (prevByUtlId):
            prevOverride = json_decode(prevByUtlId[utlId].bet_score_override ?? '{}')
            return bet.score + (prevOverride[bet.id] ?? 0)
        )
    }
).sortByDesc('score')

# Tied-rank assignment
rank = null; lastScore = -1
for (i, row) in rows:
    if row.score != lastScore: rank = i + 1   # ties keep the same rank
    upsert Leaderboard(version_id, utl_id, side_tournament_id)
        .rank, .score, .bet_score_override = row.bet_score_override
```

Key takeaways:
- **`bet_score_override`** is a JSON map keyed by `bet.id` holding the running total of non-game-bet scores up to and including this version. This lets the SPA show per-bet score contributions ("you've earned 12 pts on the top-scorer question so far") without recomputing.
- **Ties share a rank** (1, 1, 3, 4 — not 1, 2, 3, 4).
- **`getBetsScorePerUtlForGame(gameId, sideTournamentId)`** is implemented on `Tournament`. It filters to `competingUtls()` (or the side tournament's `competingUtls()`), then for each calls `TournamentUser::getBetsWithScoreGainedForGame(game, sideTournamentId)`.

## Where Per-Game Special / Group-Rank Score Comes From

`TournamentUser::getBetsWithScoreGainedForGame(Game $game, ?int $sideTournamentId)` (in `app/TournamentUser.php`) returns a `Collection<Bet>` where each bet's `score` is **set to the score gained for this one game** (the bets themselves are not saved — these are replicated objects).

- The game bet for this game contributes its existing `score` (already computed in step 2). Filtered to the side tournament if applicable via `Bet::isMatchingSideTournament`.
- Each special bet computes its incremental score via `BetSpecialBetsRequest::calculateScoreForGame($game)` — e.g. top-scorer awards `eachGoal × goalsThisGame` plus the "correct" bonus only when the FINAL is played. See BET_SCORING.md.
- Each group-rank bet contributes its full `bet.score` only when the game is the last game of that group (`game.isTheLastGameOnGroup() && game.group.id == bet.type_id`). Otherwise 0.

## Side Tournaments

Side tournaments are a parallel leaderboard for a subset of UTLs.

- The UTL list is in `SideTournament.config.competingUtls` (array of UTL IDs).
- Which side tournaments are scored on which game is controlled by `tournament.config.sideTournamentGames[gameId] = [sideTournamentId, ...]`. Admins set this via the `POST /admin/update-side-tournament-games` endpoint.
- The leaderboard table holds parallel rows: `Leaderboard.side_tournament_id` is nullable (null = main leaderboard).
- An index on `(version_id, side_tournament_id)` keeps lookups fast.

## Recomputing After a Mistake

If a match was completed with the wrong result:

1. Hit `/admin/decomplete-match/{id}` (`AdminController::removeMatchResult`) to flip `is_done = false` and clear results.
2. Re-complete with the right scores via `/admin/complete-match/...`.
3. `UpdateLeaderboards::updateRanks` will reprocess from this game forward.

If a special-bet answer needs to change (e.g. MVP), update via the matching admin endpoint (announceMVP, UpdatePlayerFromGoalsData, etc.). `CalculateSpecialBets::execute` re-runs `SpecialBet::calculateBets()` which rewrites each bet's `score` directly. Subsequent leaderboard recomputes pick up the new scores.

## Legacy: `Ranks`

Old monolithic JSON ranking store (`app/Ranks.php`, table `ranks`). Still updated via three admin endpoints (`createNewRankingRow`, `updateLastRankingRow`, `removeLastRankingRow`) but reads should go through `LeaderboardsVersion` / `Leaderboard`. Don't build new features on top of `Ranks` — see GOTCHAS.md.

## Querying the Latest Leaderboard

- `Tournament::leaderboardVersionsLatest` returns the single most recent version (via `hasOne` + `latestOfMany`).
- `Tournament::get2LatestRelevantVersions()` returns the latest + the version just before the latest game-grouping (used by the live SPA to compute "score gained since last game").

## Live Updates on the Frontend

There's no WebSocket. The SPA polls via the `useLiveUpdate` hook (`frontend/src/hooks/useLiveUpdate.ts`) — typically calls `GET /api/tournaments/{id}/games` and `GET /api/tournaments/{id}/leaderboards` periodically while there are ongoing games.

## Performance Notes

- The whole flow is synchronous. There are no queue workers.
- The transaction in `updateRanksAsTransaction` covers one tournament at a time, looping the `competition.tournaments`.
- A single `completeMatch` call processes every tournament under the competition. With many tournaments and many UTLs, this can be slow.
- No indexes on `bets(tournament_id, user_tournament_id, type, type_id)` — relies on the default PK + an unindexed scan. Watch for slow leaderboard rebuilds if data grows.
