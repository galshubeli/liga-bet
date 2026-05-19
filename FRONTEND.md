# Frontend

The React SPA in `frontend/`. Built by Webpack to `public/js/react-app/appMain.js`, served by Laravel's fallback route via the `react-app.index` Blade view.

## Stack

| Layer | Tech |
|---|---|
| UI framework | React 17.0.2 + ReactDOM |
| Language | TypeScript 4.7.4 |
| State | Redux Toolkit 1.8.3 + redux-thunk 2.4.1 + reselect 4.1.6 |
| Routing | react-router-dom 5.3.3 (custom history) |
| Components | MUI 5.9.2 (`@mui/material`, `@mui/icons-material`) with Emotion 11.9.3 |
| Utility CSS | Tailwind 3.4.1 + autoprefixer + postcss |
| Component CSS | SCSS (sass 1.32.8) |
| RTL | Emotion cache + `stylis-plugin-rtl` |
| Forms | react-hook-form 7.36.1 + yup 0.32.11 + `@hookform/resolvers` |
| Drag/drop | react-beautiful-dnd 13.1.0 (for group-standings reordering) |
| Dates | dayjs 1.11.6 |
| Lodash | lodash 4.17.21 |
| Flags | react-circle-flags 0.0.18 |
| Confetti | confetti-js (celebrations) |
| Error tracking | `@sentry/react` 7.106.1, `@sentry/webpack-plugin` 2.15.0 |
| Build | Webpack 5.74 + ts-loader + babel-loader + sass-loader + postcss-loader + html-webpack-plugin + mini-css-extract |
| Source maps | full sourcemaps uploaded to Sentry on build |

## Build & Dev

```
cd frontend
npm install         # also runs `patch-package` via postinstall hook
npm run dev         # webpack --watch
npm run build       # NODE_ENV=production webpack
```

Output:
- Main bundle → `public/js/react-app/appMain.js` (versioned in the Blade template by `config('app.version')`)
- Chunks → `public/js/react-app/chunk.[name].[chunkhash].js`

Config files:
- `frontend/webpack.config.js`
- `frontend/tsconfig.json` (path alias `@/*` → `frontend/src/*`)
- `frontend/.babelrc`
- `frontend/tailwind.config.js`

## Entry Chain

```
public/js/react-app/appMain.js          (bundle)
  → src/index.tsx                       (ReactDOM.render → <App/>)
  → src/App.tsx                         (Redux store, MUI theme, RTL cache, Router, AuthController, SentryController)
  → src/AppMain.tsx                     (AppHeader, AppBody, DialogsProvider)
  → src/appContent/AppBody.tsx          (Footer + AppContent)
  → src/appContent/AppContent.tsx       (InitialDataFetcher, TournamentUserController, AppBasicRoutes)
  → src/appContent/AppBasicRoutes.tsx   (the React Router <Switch>)
```

## Routes (`src/appContent/AppBasicRoutes.tsx`)

| Path | Component | Notes |
|---|---|---|
| `/open-questions` | `openQuestionBets/OpenQuestionBetsProvider` | Edit special-question bets (pre-tournament) |
| `/takanon` | `takanon/Takanon` | Tournament rules ("תקנון") |
| `/open-group-standings` | `OpenGroupBets/OpenGroupRankBetsProvider` | Drag-to-order group standings bets |
| `/open-matches` | `open_matches/openMatchesProvider` | Score predictions for upcoming games |
| `/leaderboard` | `leaderboard/LeaderboardProvider` | The main scoreboard |
| `/closed-bets/:tab?` | `closedBets/ClosedBetsPage` | View locked-in bets, tabbed |
| `/my-bets` | `myBets/MyBetsView` | My bets across all bet types |
| `/nihusim` | `nihusim/ManageNihusim` | View / send nihusim |
| `/his-bets/:utlId` | `myBets/HisBetsView` | View another competitor's bets |
| `/` (catch-all) | `RedirectToDefaultPage` | Redirects based on tournament state |

No role guards on routes themselves — `AuthController` (`src/auth/AuthController.tsx`) gates everything above by requiring `currentUser` to be loaded.

## Persistent Layout

- **`src/appHeader/`** — `AppHeaderProvider` + `AppHeaderView`. Includes `TournamentsDropdownMenu`, desktop & mobile menu (`AppMenuDesktop`, `AppMenuMobile`), `UserMenu`, nihusim quick-access. Menu items list in `src/appHeader/routes.ts`.
- **`src/appBanner/`** — Banner (currently commented out in `App.tsx`).
- **`src/appBody.tsx`** — content + footer wrapper.
- **`src/appFooter/Footer.tsx`** — global footer.
- **`src/appLoader/`** — crucial-data loaders shown while bootstrapping.
- **`src/dialogs/DialogsProvider.tsx`** — lazy-loads every dialog under one global mount point.

## Feature Folders (`frontend/src/`)

Top-level folders that aren't infra/styling:

| Folder | What it does | API it hits | Slices it touches |
|---|---|---|---|
| `myBets/` | User's own bets across types; also `HisBetsView` for inspecting another UTL | `GET bets/games`, `GET bets/primal` | `bets`, `matches`, `dataFetcher` |
| `leaderboard/` | Live + historical leaderboards; `ExpandedContestantView`, `TableSettings` | `GET leaderboards`, `GET leaderboardVersions` | `leaderboardRows`, `leaderboardVersions`, `leaderboardsFetcher`, `scoreboardSettings` |
| `matches/` | Match-data container (rarely a page on its own) | `GET games`, `GET goals` | `matches`, `goalsData` |
| `open_matches/` | Editable match-score predictions while bets are open | `POST bets`, `GET games` | `bets`, `matches`, `dataFetcher` |
| `OpenGroupBets/` | Drag-to-order group-standings predictions (`react-beautiful-dnd`) | `POST bets`, `GET groups` | `bets`, `groups` |
| `openQuestionBets/` | Pre-tournament special-question predictions | `POST bets`, `GET special-questions` | `bets`, `specialQuestions` |
| `groupBets/` | View locked group-rank bets (closed mode) | `GET bets/primal` | `bets`, `groups` |
| `questionBets/` | View locked special-question bets (closed mode) | `GET bets/primal` | `bets`, `specialQuestions` |
| `closedBets/` | Wrapper page with tabs over groupBets/questionBets/match closed views | `GET bets/games`, `GET bets/primal` | `bets`, `matches`, `groups`, `specialQuestions` |
| `tournamentConfig/` | Tournament owner UI: score config + prizes + preferences | `PUT scores`, `PUT prizes`, `PUT preferences` | `myUtls`, `ownedTournaments` |
| `manageContestants/` | Tournament-manager UI (approve, reject, kick) | `manage/utls/*` | `contestants`, `tournamentUTLs` |
| `manageUsers/` | Site-admin user management | `/api/users/*` | `users`, `usersTotalCount` |
| `nihusim/` | Send/view nihusim (`ManageNihusim`) | `nihusim` GET/POST family | `nihusim`, `nihusGrants`, `notifications` |
| `myUTLs/` | Tournament join/leave + UTL display name | `/api/user/utls`, `/api/tournament-name/{code}` | `myUtls`, `currentTournamentUser` |
| `myProfile/`, `myUser/` | Profile / set password | `/api/user` | `currentUser` |
| `inviteFriends/` | Display tournament code | none | `myUtls` |
| `prizes/` | Display + edit tournament prizes | `PUT prizes` | `myUtls` |
| `whatifs/` | "What-if" leaderboard simulator (no API; local only) | none | `whatif` |
| `admin/` | Top-level admin panel | many `/admin/*` | `admin` |
| `dialogs/` | All modals (`GameScoreInfo/`, `MultiBet/`, `SendNihus/`, `WaitForMvp/`, `changePassword/`, `NihusExplanation/`) | various | `dialogs`, `dialogsData` |
| `widgets/` | Reusable UI primitives (see below) | none | none |
| `gumblersList/` | "Who guessed what" list helpers used inside group/question closed views | none | derived from bets/utls |
| `multiBetsSettings/` | "Fill all my tournaments" preference toggle | none | `multiBetsSettings` |
| `initialDataFetcher/` | Bootstraps tournament data on mount | many | many |
| `controllers/` | Higher-order data controllers (`TournamentUserController`) | various | many |
| `takanon/` | Static rules page | none | none |

### Widgets — `src/widgets/`

Reusable primitives. ~22 subfolders:

`Buttons`, `inputs`, `Select`, `Table`, `MatchResult`, `Player`, `TeamFlag`, `GroupStandings`, `SearchBar`, `Menu`, `Tabs`, `Tooltips`, `LoadingVIcon`, `CopyToClipboard`, `draggableList`, `koWinnerInput`, `specialAnswer`, `stickyConfig`, `TournamentInput`, `icons`, plus a few others.

### Hooks — `src/hooks/`

- `useFetcher.ts` — wraps the dataFetcher slice (used as `useGames()`, `useAllGameBets()`, etc.)
- `useGoTo.tsx` — programmatic navigation helper
- `useThemeClass.tsx` — tournament-specific CSS class
- `useTournamentLink.tsx` — builds links scoped to the current tournament
- `useLiveUpdate.ts` — polls APIs while games are live (the "WebSocket replacement")

## State Management

Store setup: `src/_helpers/store.ts`. Root reducer: `src/_reducers/root.ts`.

### Slices (31 total)

| Slice | Source | Shape (sketch) | Owned by |
|---|---|---|---|
| `bets` | `_reducers/bets.ts` | `Record<tournamentId, Record<betId, BetApiModel>>` | bets actions |
| `dataFetcher` | `dataFetcher.ts` | `{fetched, currentlyFetching, errors}` per key | useFetcher hook |
| `gameBetsFetcher` | `gameBetsFetcher.ts` | per-tournament game-bets fetch state | dataFetcher.ts actions |
| `leaderboardsFetcher` | `leaderboardsFetcher.ts` | per-tournament leaderboard fetch state | leaderboard actions |
| `teams` | `teams.ts` | `Record<teamId, Team>` | teams.ts actions |
| `leaderboardVersions` | `leaderboardVersions.ts` | `Record<tournamentId, LeaderboardVersion[]>` | leaderboard.ts actions |
| `leaderboardRows` | `leaderboardRows.ts` | `Record<tournamentId, LeaderboardRow[]>` | leaderboard.ts actions |
| `scoreboardSettings` | `scoreboardSettings.ts` | per-tournament UI prefs (columns, sort) | scoreboardSettings.ts actions |
| `specialQuestions` | `specialQuestions.ts` | `Record<questionId, SpecialQuestion>` | specialQuestions.ts actions |
| `players` | `players.ts` | `Record<playerId, Player>` | players.ts actions |
| `matches` | `matches.ts` | `Record<matchId, Match>` | matches.ts actions |
| `groups` | `groups.ts` | `Record<groupId, Group>` | groups.ts actions |
| `currentUser` | `currentUser.ts` | `User \| null` | auth.ts actions |
| `contestants` | `contestants.ts` | tournament contestants | contestants.ts actions |
| `myUtls` | `myUtls.ts` | this user's tournaments | tournament.ts actions |
| `currentTournamentUser` (`tournamentUser`) | `tournamentUser.ts` | active UTL | tournamentUser.ts actions |
| `selectedSideTournamentId` (`sideTournament`) | `sideTournament.ts` | nullable id | sideTournament.ts actions |
| `ownedTournaments` (`ownedTournament`) | `ownedTournament.ts` | tournaments owned | tournament.ts actions |
| `competitions` | `competitions.ts` | available competitions | competition.ts actions |
| `tournamentUTLs` | `tournamentUTLs.ts` | UTLs of the current tournament | tournamentUTLs.ts actions |
| `users` | `users.ts` | admin user directory | users.ts actions |
| `usersTotalCount` | `usersTotalCount.ts` | count for pagination | users.ts actions |
| `dialogs` | `dialogs.ts` | `Record<dialogName, boolean>` | dialogs.ts actions |
| `dialogsData` | `dialogsData.ts` | `Record<dialogName, any>` | dialogs.ts actions |
| `appCrucialLoaders` | `appCrucialLoaders.ts` | which crucial loads are pending | appCrucial.ts actions |
| `nihusGrants` | `nihusGrants.ts` | grants for this UTL | nihusim.ts actions |
| `nihusim` | `nihusim.ts` | nihusim sent/received | nihusim.ts actions |
| `settings` | `settings.ts` | local app settings | various |
| `notifications` | `notifications.ts` | in-app notifications | notifications.ts actions |
| `multiBetsSettings` | `multiBetsSettings.ts` | "fill all tournaments" toggle | multiBetsSettings.ts actions |
| `goalsData` | `goalsData.ts` | per-game scorer data | matches.ts actions |
| `whatif` | `whatif.ts` | what-if mode state | whatifs.ts actions |
| `admin` | `admin/admin.ts` | admin tools state | admin.ts actions |

**No RTK Query.** All async work is plain Redux thunks.

### Selectors — `src/_selectors/`

Memoized via `reselect`. Top-level files include: `auth`, `appHeader`, `closedMatchBets`, `congratsAnimation`, `createNewTournament`, `dialogs`, `gameGoalsData`, `groupStandingBets`, `index`, `leaderboard`, `manageTournamentUTLs`, `myBets`, `noSelector`, `openMatches`, `questionBets`, `tournaments`. Plus subfolders `base/`, `logic/`, `modelRelations/`.

`src/_selectors/index.ts` is the main barrel.

### Actions / Thunks — `src/_actions/`

26 domain modules: `admin`, `appCrucial`, `auth`, `bets`, `competition`, `contestants`, `dataFetcher`, `dialogs`, `groups`, `importBets`, `leaderboard`, `matches`, `multiBetsSettings`, `nihusim`, `notifications`, `players`, `scoreboardSettings`, `sideTournament`, `specialQuestions`, `teams`, `tournament`, `tournamentUser`, `tournamentUTLs`, `users`, `utils`, `whatifs`.

Pattern: `fetchAndStoreXxx` (GET + store), `sendXxx` (POST/PUT + store), `updateXxx`, `removeXxx`.

## API Layer — `src/api/`

HTTP client: `src/api/common/apiRequest.ts`. Tiny wrapper around `window.$.ajax` (jQuery). Returns `Promise`. Auth is implicit (cookies / sessions); CSRF token is read from the meta tag by global jQuery setup.

```ts
sendApiRequest({
  type: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: '/api/...',
  data?: object,
  includeResponseHeaders?: string[],
  hideErrorToastr?: boolean,
})
```

Errors surface via toastr (`reportApiError`) unless silenced with `hideErrorToastr`.

Domain modules: `admin.ts`, `bets.ts`, `competitions.ts`, `contestants.ts`, `groups.ts`, `leaderboard.ts`, `matches.ts`, `nihusim.ts`, `players.ts`, `specialQuestions.ts`, `teams.ts`, `tournaments.ts`, `users.ts`, `utls.ts`, plus shared `types.ts` and `common/apiRequest.ts`.

## TypeScript Types — `src/types/`

| File | Types |
|---|---|
| `tournament.ts` | `Tournament`, `TournamentStatus`, `TournamentConfig`, `TournamentScoreConfig`, `TournamentPreferences`, `SideTournament`, `DetailedContestantData` |
| `match.ts` | `Match`, `MatchApiModel`, `GameType`, `KnockoutStage`, `WinnerSide`, `MatchWithGoalsData` |
| `bet.ts` | `BetApiModel`, `MatchBet`, `BetType` (enum) |
| `user.ts` | `User`, `UserPermissions` |
| `leaderboard.ts`, `leaderboardVersion.ts` | `LeaderboardRow`, `LeaderboardVersion` |
| `specialQuestion.ts` | `SpecialQuestion`, `SpecialQuestionType` |
| `teams.ts`, `group.ts`, `player.ts` | `Team`, `Group`, `Player` |
| `utl.ts` | `UTL`, `UtlRole` |
| `nihusim.ts`, `nihusGrant.ts` | `NihusGrant`, `NihusType` |
| `notifications.ts` | in-app notification types |
| `goalsData.ts` | per-game goal/assist data |
| `dataFetcher.ts` | `FetchGameBetsParams`, `GameBetsFetchType` |
| `loaders.ts` | `CrucialLoader` enum |
| `combinedModels.ts`, `mixedModels.ts` | composed types |
| `common.ts`, `rules.ts`, `competition.ts`, `index.ts` | shared / barrel |

## Styling

- **Tailwind** is the default — entry: `src/tailwind.css`, config: `frontend/tailwind.config.js` (extends `src/styles/tailwind/mainTheme`).
- **SCSS** for per-component styles. Globals: `src/styles/global.scss`, `App.scss`, `oldStyling.scss`, `ko_switch.scss`. Helpers: `src/styles/_colors.scss`, `_mixins.scss`, `_shadows.scss`.
- **MUI Theme** (`src/themes/theme.ts`): `direction: 'rtl'`, custom breakpoints (`xs=0, sm=600, md=1000, lg=1300, xl=1600`).
- **RTL** wired via Emotion cache in `src/_helpers/RTL.tsx` using `stylis-plugin-rtl` — auto-mirrors layouts for Hebrew.
- **`tailwind-merge`** is in devDependencies for `cn(...)`-style class merging.

## Hebrew / i18n

There is **no translation layer**. UI strings are inline Hebrew or in `src/strings/` (`stages.ts`, `groups.ts`, `teamNames.ts`, `bets.ts`). To add another language you'd need to introduce a string-table abstraction.

## Auth on the Frontend

- Authentication is server-side (sessions). On boot the SPA calls `GET /api/user` to populate `currentUser`.
- `src/auth/AuthController.tsx` blocks rendering until `currentUser` resolves; redirects to login on 401.
- CSRF token: read from the `<meta name="csrf-token">` injected by `react-app.index.blade.php` and configured on jQuery's ajax setup at startup.

## Sentry

- Wired in `src/SentryController.tsx`.
- Webpack uploads source maps via `@sentry/webpack-plugin` on production builds (config in `frontend/webpack.config.js`).

## Tests

**No frontend tests.** No Jest/Vitest/RTL setup. ESLint's `react-app/jest` preset is referenced but no test files exist.

## Adding Things

See `RECIPES.md` for:
- Add a new SPA route
- Add a new Redux slice
- Add a new dialog
- Add a new API call
