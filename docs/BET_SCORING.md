# Bet Scoring

The pricing engine. Every bet eventually returns an integer score from a `calculate()` method on a `BetXxxRequest`, written into `bets.score`. Point values come from the **per-tournament** `tournament.config.scores.*` JSON, which is seeded from `config/defaultScore.php` and editable while the tournament is `STATUS_INITIAL`.

## Where Things Live

| File | What |
|---|---|
| `app/Bets/AbstractBet.php` | Common shape for all bets. `static save(UTL, Request)` is the canonical upsert |
| `app/Bets/AbstractBetRequest.php` | `getScoreConfig($path)` reads `tournament.config.scores.{path}` with default 0 |
| `app/Bets/BetableInterface.php` | Implemented by `Game`, `Group`, `SpecialBet` — provides `getID()` |
| `app/Bets/BetMatch/BetMatchRequest.php` | Match bet validation + scoring |
| `app/Bets/BetGroupsRank/BetGroupRankRequest.php` | Group standings bet |
| `app/Bets/BetSpecialBets/BetSpecialBetsRequest.php` | Special-question bet (7 sub-types) |
| `config/defaultScore.php` | Default `scores.*` seeded into every new tournament |
| `app/Tournament.php:hasValidScoreConfig` | Pre-start validation |

## Score Config Schema (`tournament.config.scores`)

```jsonc
{
  "gameBets": {
    "groupStage": {
      "winnerSide": 2,    // correct 1X2 outcome
      "result": 4         // exact score
    },
    "knockout": {
      "qualifier": 3,     // correct team advanced (two-legged or tiebreaker)
      "winnerSide": 3,
      "result": 12
    },
    "bonuses": {
      // added on top of `knockout` for the corresponding sub_type
      "final":          { "qualifier": 2, "winnerSide": 2, "result": 4 },
      "semiFinal":      { "qualifier": 1, "winnerSide": 1, "result": 2 }
      // The code also reads bonuses for: thirdPlace, quarterFinal, last16, last32
      // (defaults to 0 if absent). Only final + semiFinal are in defaultScore.php.
    }
  },
  "groupRankBets": {
    "perfect": 12,
    "minorMistake": 6
  },
  "specialBets": {
    "offensiveTeam": 10,
    "defensiveTeam": 0,             // partial — see below
    "mvp": 20,
    "winner":   { "quarterFinal": 4, "semiFinal": 6, "final": 20, "winning": 30 },
    "runnerUp": { "quarterFinal": 4, "semiFinal": 6, "final": 20 },
    "topScorer":  { "correct": 8, "eachGoal": 4 },
    "topAssists": { "correct": 8, "eachGoal": 3 }
  },
  "specialQuestionFlags": {
    "winner": true,
    "runnerUp": true,
    "topScorer": true,
    "mvp": true,
    "topAssists": true,
    "offensiveTeam": true
    // "defensiveTeam" is supported by SpecialBet::TYPE_DEFENSIVE_TEAM
    // but the flag is not in defaultScore.php — see GOTCHAS.md
  }
}
```

`getScoreConfig($path)` defaults absent keys to `0`. So missing scoring entries silently mean "this is worth zero points," not an error.

## Match Bets (`BetTypes::Game = 1`)

### Bet data shape (`bets.data` JSON)
```json
{
  "result-home": 2,
  "result-away": 1,
  "ko_winner_side": "home"
}
```
- `result-home` / `result-away` — predicted 90-minute scoreline. Both required for normal games.
- `ko_winner_side` — `"home"` or `"away"`. Required for knockout games when the score is tied AND the qualifier scoring is enabled; **also** required for two-legged ties.

### Validation (`BetMatchRequest::validateData`, `validateDataTwoLeggedTie`)
- Both result fields must be numeric for normal games.
- For two-legged ties (UCL):
  - Leg 2 bets can be submitted with **only** a qualifier (auto-paired from leg 1) or **only** a score (qualifier auto-derives from the leg-1 winner). The validator allows both partial shapes for the last leg.
  - For knockout games where `scores.gameBets.knockout.qualifier > 0` and the predicted score is tied, `ko_winner_side` must be `"home"` or `"away"`.

### Scoring (`BetMatchRequest::calculate`)
```
if game is knockout:
    score = calculate90Minutes("knockout") + bonus
else:
    score = calculate90Minutes("groupStage")
```

`calculate90Minutes($type)`:
```
if either prediction is null → return 0
score = 0
if exact match → score += scores.gameBets.{type}.result
if is1X2Success (winner side OR draw → draw) → score += scores.gameBets.{type}.winnerSide
return score
```

`calculateKnockout($type)` adds a **qualifier bonus** on the last leg:
```
score = calculate90Minutes($type)
if game.isLastLeg() && bet.qualifier == game.knockoutWinnerSide:
    score += scores.gameBets.{type}.qualifier
return score
```

`calculate()` then adds a **stage bonus** (`scores.gameBets.bonuses.{stage}.*`):

| `Game::sub_type` | Bonus path |
|---|---|
| `FINAL` | `bonuses.final` |
| `THIRD_PLACE` | `bonuses.thirdPlace` |
| `SEMI_FINALS` | `bonuses.semiFinal` |
| `QUARTER_FINALS` | `bonuses.quarterFinal` |
| `LAST_16` | `bonuses.last16` |
| `LAST_32` | `bonuses.last32` |
| anything else | `bonuses.empty` (always 0) |

The bonus path is the same shape as `knockout` (`qualifier`, `winnerSide`, `result`).

### When match scoring runs
- `AdminController::completeMatch` → `UpdateGameBets::handle(Game)` (`app/Actions/UpdateGameBets.php:32` calls `$bet->score = $betRequest->calculate()`).
- Triggered manually per match; not event-driven.

## Group Rank Bets (`BetTypes::GroupsRank = 2`)

### Bet data shape
```json
{
  "0": 11,    // team_id for position 1
  "1": 12,    // team_id for position 2
  "2": 13,    // team_id for position 3
  "3": 14     // team_id for position 4
}
```
String keys `"0".."3"` (positions), values are `team_id`s. The validator enforces exactly four positions and that the team_ids match the group's actual teams (any order).

### Scoring (`BetGroupRankRequest::calculate`)
```
finalRanks = group.getStandings()   // ordered team_ids 1..4
minorMistakes = 0
for each (position, predicted_team_id) in ranking:
    if predicted_team_id == finalRanks[position]:    # exact match
        continue
    if predicted_team_id is at position±1 in finalRanks:  # neighbor swap
        minorMistakes += 1
    else:
        return 0   # any team off by >1 → instant zero
    if minorMistakes >= 3:
        return 0

return minorMistakes ? scores.groupRankBets.minorMistake : scores.groupRankBets.perfect
```

**Tolerance rule:** up to 2 "minor mistakes" (adjacent swaps) earns the `minorMistake` score; 0 mistakes earns `perfect`; anything else earns 0.

### When group rank scoring runs
- `Group::calculateBets()` (`app/Group.php:120`) called by `AdminController::calculateGroupRanks` and also by `UpdateCompetitionStandings` when standings change.

## Special Bets (`BetTypes::SpecialBet = 3`)

Seven sub-types, each with its own formula. One special bet per question per tournament, multiple user predictions.

### Bet data shape
```json
{ "answer": 42 }
```
Always an `answer` field; values:
- player_id (for MVP, TOP_SCORER, MOST_ASSISTS)
- team_id (for WINNER, RUNNER_UP, OFFENSIVE_TEAM, DEFENSIVE_TEAM)

### Validation (`BetSpecialBetsRequest::validateAnswer`)
- player questions → must be an integer; player must exist in the competition
- team questions → must be an integer; team must exist in the competition
- Cross-question conflicts (e.g. picking the same team for Winner and Runner-Up) are **not** rejected (the commented-out code in the file explains why — it was causing errors during scoring).

### Scoring (full-bet `calculate()`)

| Sub-type | Formula |
|---|---|
| `MVP` | If `SpecialBet.answer` is null → null. If `bet.answer == answer` → `scores.specialBets.mvp`. Else 0. |
| `TOP_SCORER` | `player.goals × scores.specialBets.topScorer.eachGoal` + (if `bet.answer` is in `answer.split(',')` → `scores.specialBets.topScorer.correct`) |
| `MOST_ASSISTS` | Same shape as top scorer but `eachGoal` is multiplied by `player.assists`. Bonus key `scores.specialBets.topAssists.correct` (falls back to plain `scores.specialBets.topAssists` if `correct` not set — BC fallback) |
| `OFFENSIVE_TEAM` | If `SpecialBet.answer` is null → null. If `bet.answer` is in `answer.split(',')` → `scores.specialBets.offensiveTeam`. Else 0. |
| `DEFENSIVE_TEAM` | Same as offensive but `scores.specialBets.defensiveTeam` — **0 by default since defaultScore.php has no such key.** |
| `WINNER` | `calcRoadToFinal("winner")` — for each knockout round the predicted team actually advanced through, award the stage-specific bonus. See below. |
| `RUNNER_UP` | `calcRoadToFinal("runnerUp")` — same, but no `winning` key (you can't "win" as runner-up). |

`SpecialBet.answer` can be a **comma-separated list of IDs** — supports ties (multiple top scorers, multiple offensive teams). `in_array($bet.answer, explode(',', answer))` is the comparison.

### `calcRoadToFinal($type)` for WINNER / RUNNER_UP
```
koGames = competition.getKnockoutGames(bet.answer)
score = 0
for each game in koGames:
    if game.knockoutWinner == bet.answer:
        match game.sub_type:
            LAST_16        → score += scores.specialBets.{type}.quarterFinal
            QUARTER_FINALS → score += scores.specialBets.{type}.semiFinal
            SEMI_FINALS    → score += scores.specialBets.{type}.final
            FINAL          → score += scores.specialBets.{type}.winning   # winner only
return score
```

Defaults: `winner = {quarterFinal: 4, semiFinal: 6, final: 20, winning: 30}`, `runnerUp = {quarterFinal: 4, semiFinal: 6, final: 20}`.

### Per-game incremental scoring (`calculateScoreForGame(Game $game)`)
Used by `TournamentUser::getBetsWithScoreGainedForGame` to update the live leaderboard one game at a time, instead of recomputing the entire special-bet score after every game.

| Sub-type | Incremental rule |
|---|---|
| `MVP` | Award full `mvp` score only when `sub_type == FINAL` |
| `TOP_SCORER` | Add `goalsData.goals × eachGoal` for **this game's** scorers; award `correct` bonus only on `FINAL` |
| `MOST_ASSISTS` | Same shape — uses `goalsData.assists` |
| `OFFENSIVE_TEAM` / `DEFENSIVE_TEAM` | Award the full bonus only on the **last group-stage game** (`game.isTheLastGameOfGroupStage()`) |
| `WINNER` / `RUNNER_UP` | When a knockout game completes, award the per-stage bonus for that round if `game.knockoutWinner == bet.answer` |

### When special-bet scoring runs
- Full: `SpecialBet::calculateBets()` → looped over by `CalculateSpecialBets::execute()` (`app/Actions/CalculateSpecialBets.php`) triggered by admin endpoints (announce MVP, update scorers, etc.).
- Incremental: `TournamentUser::getBetsWithScoreGainedForGame()` called by `UpdateLeaderboards` to produce the `bet_score_override` JSON on each `Leaderboard` row.

## Defaults — `config/defaultScore.php` (verbatim)

```php
return [
    "gameBets" => [
        "groupStage" => ["winnerSide" => 2, "result" => 4],
        "knockout"   => ["qualifier" => 3, "winnerSide" => 3, "result" => 12],
        "bonuses" => [
            "final"     => ["qualifier" => 2, "winnerSide" => 2, "result" => 4],
            "semiFinal" => ["qualifier" => 1, "winnerSide" => 1, "result" => 2],
        ],
    ],
    "groupRankBets" => ["perfect" => 12, "minorMistake" => 6],
    "specialBets" => [
        "offensiveTeam" => 10,
        "winner"   => ["quarterFinal" => 4, "semiFinal" => 6, "final" => 20, "winning" => 30],
        "runnerUp" => ["quarterFinal" => 4, "semiFinal" => 6, "final" => 20],
        "mvp"      => 20,
        "topAssists" => ["correct" => 8, "eachGoal" => 3],
        "topScorer"  => ["correct" => 8, "eachGoal" => 4],
    ],
    "specialQuestionFlags" => [
        "winner" => true, "runnerUp" => true, "topScorer" => true,
        "mvp" => true,    "topAssists" => true, "offensiveTeam" => true,
    ],
];
```

Notable absences from the defaults:
- `gameBets.bonuses.thirdPlace`, `quarterFinal`, `last16`, `last32` (scoring code reads them; if missing → 0 bonus)
- `specialBets.defensiveTeam` and `specialQuestionFlags.defensiveTeam`

## `config/bets.php` — pre-game lock

| Key | Source | Effect |
|---|---|---|
| `lockBeforeSeconds` | `BETS_LOCK_BET_BEFORE_HOURS × 3600`, default 0 | Bets close N hours before a game's `start_time`. Read by `Game::isOpenForBets()` |
| `lockBetsBeforeTournamentSeconds` | `BETS_LOCK_BETS_BEFORE_TOURNAMENT_HOURS × 3600`, default 0 | Pre-tournament group/special bets close N hours before tournament `start_time` |
| `mvp` | env `MVP`, default null | Forced MVP answer override |
| `topAssists` | env `TOP_ASSISTS_PLAYER`, default null | Forced top-assists override |

## Worked Examples

### Example 1 — group-stage game with default config
- Actual result: 2–1 (home win). Bet: 2–1 home win.
- Exact match → +4 (`gameBets.groupStage.result`)
- 1X2 correct → +2 (`gameBets.groupStage.winnerSide`)
- **Total: 6 pts**

### Example 2 — semi-final with default config
- Actual result: 1–1 (home wins on penalties). Bet: 1–1, qualifier=home.
- 90-min exact match → +12 (`gameBets.knockout.result`)
- 1X2 correct (draw==draw) → +3 (`gameBets.knockout.winnerSide`)
- Qualifier correct → +3 (`gameBets.knockout.qualifier`)
- Stage bonus (semiFinal): result(+2) + winnerSide(+1) + qualifier(+1) = +4
- **Total: 22 pts**

### Example 3 — group rank with one swap
- Actual: A,B,C,D. Bet: B,A,C,D (positions 1↔2 swapped).
- 2 minor mistakes (A and B both off by 1) — under the 3-mistake cap → **6 pts** (`minorMistake`)

### Example 4 — top scorer with default config
- Player has 6 goals. Bet on this player. Answer list includes player.
- `eachGoal × goals = 4 × 6 = 24` + `correct = 8` → **32 pts**
