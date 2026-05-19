# Backend Internals

Everything inside `app/` that isn't an HTTP controller. Models, the Bet engine, Actions, Enums, notifications.

## Models — Relationships and Key Methods

All models live at `app/` root unless noted. Documented properties are the *interesting* ones, not every column — see `DATABASE_SCHEMA.md` for full column lists.

### `Tournament` — `app/Tournament.php`

**Constants:** `STATUS_INITIAL`, `STATUS_ONGOING`, `STATUS_DONE`.

**Relationships:**
- `competition(): BelongsTo`
- `preferences(): HasOne` → `TournamentPreferences`
- `bets(): HasMany`
- `utls(): HasMany` → `TournamentUser`
- `specialBets(): HasMany`
- `leaderboardVersions(): HasMany`
- `leaderboardVersionsLatest(): HasOne` (latestOfMany)
- `sideTournaments(): HasMany`
- `nihusim(): HasMany`

**Key methods:**
- `confirmedUtls()`, `competingUtls()` — filtered UTL collections
- `getUtlOfUser(User $user)` — find a UTL by user
- `shouldAutoConfirmNewUtls()` — reads `preferences.auto_approve_users`
- `hasStarted()` — status is `ongoing` or `done`
- `start()` — flips to `ongoing`, deletes deprecated question bets, validates score config
- `finish()` — flips to `done`
- `static mapScoreConfigToNumeral(array)` / `updateToNumeralScoreConfig()` — coerces stringy config to ints
- `getMvpId()` — answer of the MVP special bet, or null
- `get2LatestRelevantVersions()` — for live leaderboard diffing
- `getBetsScorePerUtlForGame(int $gameId, ?int $sideTournamentId)` — used by `UpdateLeaderboards`
- `calcRanks($betsScoreSum, $versionId)` — assigns rank within a version
- `hasValidScoreConfig()` — pre-start validation
- `deprecatedQuestionBets()` / `deleteDeprecatedQuestionBets()` — handle `specialQuestionFlags` toggles
- `createUTL(User $user, string $name)`

### `TournamentUser` (UTL) — `app/TournamentUser.php`, table `user_tournament_links`

**Constants:** `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_CONTESTANT`, `ROLE_NOT_CONFIRMED`, `ROLE_REJECTED`, `ROLE_MONKEY`. `static permissions(string $role)` maps to numeric ladder 3→-2.

**Relationships:** `tournament`, `user`, `bets (user_tournament_id)`, `nihusGrants`, `nihusimTargeted (target_utl_id)`, `nihusimSent (sender_utl_id)`.

**Predicates:** `isAdmin()`, `isManager()`, `isContestant()`, `isNotConfirmed()`, `isRejected()`, `isMonkey()`, `hasManagerPermissions()`, `isConfirmed()`, `isRegistered()`, `isCompeting()` (confirmed OR monkey).

**Key methods:**
- `getTotalNihusimGranted()`, `getTotalNihusimSent()`, `getAvailabileNihusim()` (sic typo — "Availabile")
- `wasAnActiveUser()` — heuristic: bet on at least `n−6` of pre-semifinal group games
- `getGamesMissingBet()` — open games today/tomorrow that the UTL hasn't bet on
- `getQuestionsMissingBet()` — special questions still open without a bet
- `getGroupsMissingRankBet()` — groups without a rank bet
- `getMissingOpenBets()` — combines all three (used by notifications endpoint)
- `getBetsWithScoreGainedForGame(Game $game, ?int $sideTournamentId)` — per-game score gain, including special bets and group ranks; the heart of live leaderboard updates

### `User` — `app/User.php`

**Constants:** `TYPE_ADMIN=2`, `TYPE_TOURNAMENT_ADMIN=1`, `TYPE_USER=0`, `TYPE_MONKEY=-1`.

**Trait:** `Notifiable` (for FCM via `sendNotifications($title, $body)` which sends to `fcm_token`).

**Relationships:** `utls`, `ownedTournaments (creator_user_id)`, `tournaments (BelongsToMany via UTL)`.

**Predicates:** `isAdmin()`, `isTournamentAdmin()`, `hasTournamentAdminPermissions()` (admin OR tournament-admin), `isMonkey()`, `isConfirmed(int $tournamentId)`.

**Key methods:**
- `canJoinAnotherTournament($competitionId)` — caps at 3 tournaments per competition
- `getTournamentUser($tournamentId)` — UTL for this tournament, if any
- `static getMonkeyUsers()`
- `static getIdToNameMap()` — name lookup map
- `sendNotifications($title, $body)` — FCM push

### `Game` — `app/Game.php`, table `matches`

**Constants:** `TYPE_KNOCKOUT`, `TYPE_GROUP_STAGE`, `LEG_TYPE_FIRST`, `LEG_TYPE_SECOND`.

**Relationships:** `teamHome`, `teamAway`, `competition`, `group`, `scorers` (deprecated).

**Key methods (selected):**
- `isTwoLeggedTie()`, `isFirstLeg()`, `isSecondLeg()`, `isLastLeg()`, `getOtherLegGame()`
- `isKnockout()`, `isGroupStage()`, `isTheLastGameOnGroup()`, `isTheLastGameOfGroupStage()`, `isTheFinal()`
- `isOpenForBets()`, `isClosedForBets()`, `hasStarted()`, `isLive()`
- `getWinnerSide()` / `getKnockoutWinnerSide()` / `getKnockoutWinner()` / `getKnockoutLoser()`
- `getTeamIdByWinnerSide($side)`, `getTeamSide(int $teamId)`, `getTeamIds()`
- `getAggResults()` — aggregate score across two legs
- `decompleteBets()`, `getBets(): Collection`
- `scopeIsDone($query, $isDone)` — query scope
- `formatMatchResult($options)`, `generateRandomBetData(...)`

### `Bet` — `app/Bet.php`

**Relationships:** `utl (user_tournament_id)`, `tournament`.

**Predicates:** `isGameBet()`, `isGroupRankBet()`, `isQuestionBet()`.

**Key methods:**
- `getData($key, $default)` — JSON column accessor
- `getAnswer()` — for special bets
- `getRelatedGame()` — only for game bets
- `getKoWinnerSide()`, `getKoWinnerTeamId()` — for knockout match bets
- `isMatchingSideTournament(?int $sideTournamentId)` — used by `UpdateLeaderboards` to attribute bets to side leaderboards
- `getRequest()` — returns the matching `BetMatch|BetGroupRank|BetSpecialBets` instance for this row
- `export_data()` — serialisation for API responses

### `Competition` — `app/Competition.php`

**Constants:** `STATUS_INITIAL/ONGOING/DONE`, `TYPE_WC` (World Cup), `TYPE_UCL` (UEFA Champions League).

**Relationships:** `tournaments`, `games`, `groups`, `teams`, `players (HasManyThrough via teams)`, `goalsData (HasManyThrough via games)`.

**Key methods:**
- `isClubsCompetition()` — true for UCL (some game logic is club-specific)
- `getCompetitionType()`
- `getCrawler()` — returns the right `app/DataCrawler/*` for external data sync
- `getSortedGameIds()`, `getKnockoutGames(?int $teamId)`, `getFinalGame()`
- `getIdsOfLastGroupGames()`, `getLastGroupStageGameId()`, `getGroupStageGames()`, `getGroupStageGamesIfStageDone()`
- `getTournamentStartTime()`, `areBetsOpen()`, `isStarted()`, `hasStarted()`, `isDone()`, `isGroupStageDone()`, `hasAllGroupsStandings()`
- `getOffensiveTeams()`, `getTopScorersIds($live)`, `getMostAssistsIds($live)` — for special-bet answer computation
- `shouldUpdateUpcomingGamesStartTime()` / `resetShouldUpdateUpcomingGamesStartTime()`
- `getGamesToFixScorers()`
- `get365Id()`, `isSupports365TeamExtId()` — external API integration

### `Group` — `app/Group.php` (implements `BetableInterface`)

**Relationships:** `teams (hasMany)`, `competition`.

**Key methods:**
- `isComplete()`, `getTotalGamesCount()`
- `getStandings(): array` — ordered team IDs after all group games
- `getTeamIDByPosition($position_case)` — for resolving bracket placeholders
- `calculateBets()` — rescores all `GroupsRank` bets for this group
- `getID()`, `getName()`, `generateRandomBetData()`
- `fartStandings(): array` — yes, typo; appears to be a debug/snapshot helper

### `SpecialBet` — `app/SpecialBets/SpecialBet.php` (implements `BetableInterface`)

**Constants:** `TYPE_WINNER`, `TYPE_RUNNER_UP`, `TYPE_TOP_SCORER`, `TYPE_MOST_ASSISTS`, `TYPE_MVP`, `TYPE_OFFENSIVE_TEAM`, `TYPE_DEFENSIVE_TEAM` (partial — scoring exists, config defaults don't).

**Relationships:** `tournament`.

**Key methods:**
- `getChampions()` — for winner question
- `getRunnerUp()`
- `calculateBets()` — rescores all bets of this type
- `isPlayerQuestion()` — true for MVP / top scorer / most assists
- `getID()`, `getFlagName()`, `isOn()` — `isOn()` reads `tournament.config.scores.specialQuestionFlags.{type}`
- `generateRandomBetData()`
- `static getByType(int $tournamentId, string $type)` — lookup helper

### `Leaderboard` — `app/Leaderboard.php`

**Relationships:** `leaderboardVersions (version_id)`, `tournament`, `tournamentUser (user_tournament_id)`.

### `LeaderboardsVersion` — `app/LeaderboardsVersion.php`

**Relationships:** `leaderboards: hasMany (version_id)`.

### `SideTournament` — `app/SideTournament.php`

**Relationships:** `tournament`.

**Key methods:** `getConfig()`, `competingUtls()`, `isUserCompeting(User $user)`.

### `Nihus` — `app/Nihus.php`

**Relationships:** `sender (TournamentUser, sender_utl_id)`, `target (TournamentUser, target_utl_id)`.

### `NihusGrant` — `app/NihusGrant.php`

**Relationship:** `utl (TournamentUser)`.

### `Team` — `app/Team.php`

**Relationships:** `competition`, `players (hasMany)`.

### `Player` — `app/Player.php`

**Relationships:** `team`, `goalsData (hasMany GameDataGoal)`.

### `GameDataGoal` — `app/GameDataGoal.php`

**Relationships:** `game`, `player`.

### `TournamentPreferences` — `app/TournamentPreferences.php`

**Methods:** `isAutoConfirmUtlsOn()`.

### `Ranks` — `app/Ranks.php` (LEGACY)

**Methods:** `getData($key)`, `static updateRanks()`, `static updateLastRank()`, `static removeLastRank()`.

### `InvitaionsForTournamentAdmin` — `app/InvitaionsForTournamentAdmin.php`

Note the misspelling — `Invitaions` not `Invitations`. Mirrors the `email_of_unregistered_tournament_admin` table.

### `PasswordResetToken` — `app/PasswordResetToken.php`

Standard Laravel password-reset model.

## The Bet Engine — `app/Bets/*`

Three concrete bet types, each with a `BetXxx` (bet object) + `BetXxxRequest` (validation + scoring) pair. All extend `AbstractBet` / `AbstractBetRequest`. `BetableInterface` is implemented by `Game`, `Group`, `SpecialBet`.

```
app/Bets/
├── AbstractBet.php
├── AbstractBetRequest.php
├── BetableInterface.php
├── BetMatch/
│   ├── BetMatch.php
│   └── BetMatchRequest.php
├── BetGroupsRank/
│   ├── BetGroupRank.php
│   └── BetGroupRankRequest.php
└── BetSpecialBets/
    ├── BetSpecialBets.php
    └── BetSpecialBetsRequest.php
```

`AbstractBet::save(TournamentUser, AbstractBetRequest)` is the canonical "upsert a bet" method, used by all bet types via `BetsController::submitBets`.

`AbstractBetRequest::getScoreConfig($path)` reads `tournament.config.scores.{path}` with default 0.

See `BET_SCORING.md` for the full scoring math.

## Actions — `app/Actions/*`

The "command" pattern. Each Action is a single-purpose class, usually with a `handle()` method (or `execute()` for `CalculateSpecialBets`). Many are constructor-injected into other actions / controllers (Laravel resolves them automatically).

| Action | Entry method | Purpose |
|---|---|---|
| `CreateCompetition` | `handle(string $id)` | Creates a new competition from external API data |
| `CreateTournament` | `handle(User, Competition, string $name): Tournament` | Creates tournament + UTL + special bets (delegates to `CreateTournamentSpecialBets`) |
| `CreateTournamentSpecialBets` | `handle(Tournament)` | Generates `SpecialBet` rows according to `specialQuestionFlags` |
| `CreateMonkeyUser` | `handle(Tournament, ?string $name): User` | Creates a monkey user + UTL with `ROLE_MONKEY` |
| `MonkeyAutoBetCompetitionGames` | `handle(User, Game)` | Auto-generates bets for monkey users on a game |
| `UpdateCompetition` | `handle(...)` | The big external-data sync. Pulls fixtures/results from Football-Data.org, updates games, standings, scorers |
| `UpdateCompetitionScorers` | constructor-injected; `handle(Competition)`, `fake(...)` | Refreshes player goals/assists from `game_data_goals` |
| `UpdateCompetitionStandings` | `handle(Competition)`, `fake(...)` | Recomputes group standings |
| `UpdateGameBets` | `handle(Game, $scoreHome, $scoreAway, $isAwayWinner)` | Scores all match bets for a finished game |
| `UpdateLeaderboards` | `handle(Competition, int $firstGameId)` → loops, `updateRanksAsTransaction(Tournament, int $firstGameId)` per tournament | Builds/refreshes `LeaderboardsVersion` snapshots from the trigger game forward |
| `CalculateSpecialBets` | `execute(int $competitionId, string $type, $answer = null, $useNullAnswer = false)` | Sets the answer on matching `SpecialBet`s and rescores their bets |
| `RefetchTeamPlayers` | `handle(string $id)` | Re-pulls a team's roster from external API |
| `SyncCompetitionPlayers` | `handle(Competition)` | Bulk player roster sync |
| `SavePleyerGameGoalsData` | `handle(int $playerId, int $gameId, int $totalGoals, int $totalAssists)` | Writes a `GameDataGoal` row (typo in class name: "Pleyer" not "Player") |
| `ImportMissingUtlBets` | `handle(TournamentUser $utlFrom, TournamentUser $utlTo)` | Copies bets from one UTL to another (same competition) |

### Action chain when an admin completes a match

```
AdminController::completeMatch
  ├── Game::is_done = true, results saved
  ├── UpdateGameBets::handle(Game)
  │     └── new BetMatchRequest(...).calculate() per bet
  ├── UpdateLeaderboards::handle(Competition, firstGameId)
  │     └── per tournament:
  │           └── updateRanksAsTransaction(Tournament, firstGameId)
  │                 └── per finished game ≥ firstGameId:
  │                       ├── upsert LeaderboardsVersion(game_id, tournament_id)
  │                       └── upsert Leaderboard rows per UTL (incl. side tournaments)
  └── (if scoring config implies it) CalculateSpecialBets::execute(...)
```

See `LEADERBOARD_FLOW.md` for the full picture.

## Enums — `app/Enums/`

- `AbstractEnum` — base class with reflection-based helpers (`getConstants()`, `getKeys()`, `isValidValue()`, `getAliasFromValue()`, etc.). Used by all concrete enums.
- `BetTypes`:
  - `Game = 1`
  - `GroupsRank = 2`  (note plural)
  - `SpecialBet = 3`
- `GameSubTypes`:
  - `FINAL`, `THIRD_PLACE`, `SEMI_FINALS`, `QUARTER_FINALS`, `LAST_16`, `LAST_32`

Additional "enum-like" string constants live on models — see `TournamentUser::ROLE_*`, `SpecialBet::TYPE_*`, `Game::TYPE_*` / `LEG_TYPE_*`, `Competition::TYPE_*` / `STATUS_*`, `Tournament::STATUS_*`, `User::TYPE_*`.

## Notifications

### `app/Notifications/SendCloseCallsMatchBetsNotifications.php`
Sends FCM push notifications to UTLs who haven't bet on games starting in the next 30 minutes. Triggered via the `/notifications/send` admin route (**though the route's controller method `sendAll` doesn't exist — see BACKEND_API.md** — so currently un-callable via HTTP).

FCM is wired up via the `FcmClient` binding in `app/Providers/AppServiceProvider.php` and reads tokens from `users.fcm_token` (populated via `/register-token`).

## External Data — `app/DataCrawler/*`

Subsystem that abstracts the Football-Data.org API (v4) and a 365Scores integration. `Competition::getCrawler()` returns the right crawler. Used by `UpdateCompetition`, `CreateCompetition`, `SyncCompetitionPlayers`, `RefetchTeamPlayers`.

API tokens are hardcoded in `config/api.php` (see GOTCHAS.md).

## Console Commands — `app/Console/Commands/`

- `UpdateOngoingCompetitions` — runs `UpdateCompetition` for every competition in `STATUS_ONGOING`. **Not scheduled** (`Kernel::schedule()` is empty); run manually via `php artisan` or wire it into cron.

## Providers, Exceptions, Utils

- `app/Providers/` — Laravel default service providers + `AppServiceProvider` (FCM binding, etc.)
- `app/Exceptions/` — `Handler` + `JsonException` (the thin custom exception used across the API layer for 4xx responses)
- `app/Utils.php` — assorted helpers
