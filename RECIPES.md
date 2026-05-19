# Recipes

Step-by-step recipes for adding common things to LigaBet. Each recipe is meant to be a checklist — follow it top-to-bottom and you'll touch all the right places.

> Always read `GOTCHAS.md` before making changes. Several "obvious" approaches are wrong because of the 2022 UTL refactor or because the tournament `STATUS_INITIAL` lock kicks in.

## How to add a new bet type

If you need a brand-new bet category (i.e. not `Game`, `GroupsRank`, or `SpecialBet`):

1. **Backend — enum**
   - Add a new constant to `app/Enums/BetTypes.php` (e.g. `const MyType = 4`) and to the `$aliases` array.

2. **Backend — bet engine**
   - Add a folder `app/Bets/BetMyType/`.
   - `BetMyType.php` extends `App\Bets\AbstractBet`, mirrors `BetGroupRank.php` — implements `setRequest`, `setEntity`, `getEntity`, `static getType()`.
   - `BetMyTypeRequest.php` extends `App\Bets\AbstractBetRequest`, implements:
     - `__construct(BetableInterface, Tournament, array $data = [])`
     - `validateData($entity, $data)` — throw `InvalidArgumentException` on bad input
     - `toJson()` — what gets persisted to `bets.data`
     - `getEntity()` / `setEntity(...)`
     - `calculate(): int` — the scoring formula (uses `getScoreConfig('myType.foo')` for values)

3. **Backend — `Bet` model wiring**
   - In `app/Bet.php@getRequest`, add a case for the new type that returns your `BetMyType` class.

4. **Backend — controller dispatch**
   - In `app/Http/Controllers/BetsController.php@submitBets`, add a branch for the new type when iterating the submitted bets.
   - If the new bet kind is "primal" (set pre-tournament like group rank / special), include it in `visiblePrimalBets()` too.

5. **Backend — entity must implement `BetableInterface`**
   - Whatever the bet is "about" (a `Game`, `Group`, `SpecialBet`, or new model) must implement `App\Bets\BetableInterface` and provide `getID()`.

6. **Backend — default score config**
   - Add scoring keys to `config/defaultScore.php` under a meaningful section.
   - Update `Tournament::hasValidScoreConfig()` if your scoring is required.

7. **Backend — when scores get calculated**
   - Decide what triggers scoring. New action under `app/Actions/` (or extend `UpdateGameBets`) that loops bets of the new type and calls `BetMyTypeRequest::calculate()`.
   - Make sure leaderboards see the new scores — typically by reading them in `Tournament::getBetsScorePerUtlForGame` (or its analog).

8. **Frontend — types**
   - Add the new enum to `frontend/src/types/bet.ts` (`BetType.MyType = 4`).
   - Add a TypeScript model for the bet's data shape.

9. **Frontend — Redux**
   - Bets are already stored in the `bets` slice keyed by id. If the new bet needs a separate slice (e.g. an entity catalog), follow "How to add a new Redux slice".

10. **Frontend — API**
    - The submit endpoint is shared — `frontend/src/api/bets.ts@sendBet` already handles arbitrary `{type, data}`.

11. **Frontend — UI**
    - Add a feature folder (e.g. `frontend/src/openMyTypeBets/`) and a route in `frontend/src/appContent/AppBasicRoutes.tsx`.
    - Add a menu entry in `frontend/src/appHeader/routes.ts`.
    - Reuse `widgets/draggableList`, `widgets/Select`, etc. as needed.

12. **Frontend — closed view + leaderboard tooltips**
    - If the new bet contributes to leaderboards, surface it in `leaderboard/ExpandedContestantView` and the closed-bets view.

13. **Tests & verification**
    - Hit the bet via SPA and check `bets` table after submission.
    - Complete a relevant game/event and verify `bets.score` populates.
    - Open `/leaderboard` and confirm score updates.

## How to add a new SpecialBet sub-type

This is the smaller-scale variant of "add a new bet type" — use this when the new question fits within the existing `SpecialBet` mechanism (a question with a player or team answer).

1. **Backend — constant**
   - Add `const TYPE_MY_QUESTION = "my_question"` to `app/SpecialBets/SpecialBet.php`.
   - Add to the `static $typeToFlagName` map: `"my_question" => "myQuestion"`.

2. **Backend — validation**
   - In `BetSpecialBetsRequest::validateAnswer`, add a `case SpecialBet::TYPE_MY_QUESTION` — call `validatePlayerSelection` or `validateTeamSelection` as appropriate.

3. **Backend — scoring**
   - In `BetSpecialBetsRequest::calculate`, add a branch for `TYPE_MY_QUESTION`.
   - In `BetSpecialBetsRequest::calculateScoreForGame`, add an analog for per-game incremental scoring.
   - Decide what game completion triggers credit (group-stage end? final?) — see the existing patterns.

4. **Backend — default config**
   - Add `scores.specialBets.myQuestion = X` (or nested keys) to `config/defaultScore.php`.
   - Add `specialQuestionFlags.myQuestion = true` to `config/defaultScore.php`.

5. **Backend — answer determination**
   - If the answer can be derived from data (like top scorer), add a `Competition::getMyQuestionAnswer()` helper.
   - Add an admin endpoint to set the answer (or piggy-back on an existing one). Use `CalculateSpecialBets::execute($competitionId, SpecialBet::TYPE_MY_QUESTION, $answer)`.

6. **Backend — bet generation**
   - `CreateTournamentSpecialBets` creates `SpecialBet` rows when a tournament is created. Make sure it creates one with `type = my_question` when the flag is on.
   - `Tournament::deleteDeprecatedQuestionBets` will clean up if the flag gets turned off before start.

7. **Frontend — types**
   - Add `MyQuestion` to `frontend/src/types/specialQuestion.ts` (`SpecialQuestionType` enum).
   - Add the right value-type union (player-id, team-id, etc.).

8. **Frontend — UI**
   - `frontend/src/openQuestionBets/` already renders an answer picker per question type — add a case for the new type using `widgets/Player` or `widgets/TeamFlag`.
   - Add the Hebrew label / copy in `frontend/src/strings/` (or inline in the component).

9. **Verification**
   - Create a new tournament (must be `STATUS_INITIAL`).
   - Verify the question appears on `/open-questions`.
   - Submit an answer; verify it persists in `bets.data`.
   - Mark the answer via the admin endpoint; verify `bet.score` updates.

## How to add a new API endpoint

1. **Pick a controller** — extend an existing one if related, or add a new controller class in `app/Http/Controllers/`.

2. **Add the route** in `routes/web.php` (not `routes/api.php` — `web.php` is where everything actually goes):
   ```php
   Route::get('/api/tournaments/{tournamentId}/my-thing', [MyController::class, 'getMyThing'])
       ->middleware('confirmed_user');  // or admin, tournament_admin, etc.
   ```

3. **Implement the controller method** — for per-tournament endpoints, the signature is `(Request $request, string $tournamentId)`. Throw `JsonException("msg", 4xx)` for client errors.

4. **Frontend — API helper** in `frontend/src/api/<domain>.ts`:
   ```ts
   export const fetchMyThing = (tournamentId: number) =>
       sendApiRequest({ type: 'GET', url: `/api/tournaments/${tournamentId}/my-thing` })
   ```

5. **Frontend — thunk** in `frontend/src/_actions/<domain>.ts`:
   ```ts
   export const fetchAndStoreMyThing = (tournamentId: number): AppThunk => async (dispatch) => {
       const data = await fetchMyThing(tournamentId)
       dispatch(myThingSlice.actions.set(data))
   }
   ```

6. **Frontend — call from a component or `useFetcher`** — see `frontend/src/hooks/useFetcher.ts` for the standard pattern.

7. **CSRF**: state-changing requests (POST/PUT/DELETE) need the CSRF token; the SPA wires this globally on jQuery, so it's automatic.

## How to add a new Redux slice

1. **Create the slice file** `frontend/src/_reducers/myThing.ts`:
   ```ts
   import { createSlice, PayloadAction } from '@reduxjs/toolkit'

   type State = Record<number, MyThing>

   const initialState: State = {}

   const slice = createSlice({
       name: 'myThing',
       initialState,
       reducers: {
           set: (_state, action: PayloadAction<MyThing[]>) =>
               action.payload.reduce((acc, t) => ({...acc, [t.id]: t}), {}),
           updateOne: (state, action: PayloadAction<MyThing>) => {
               state[action.payload.id] = action.payload
           },
       },
   })

   export default slice
   ```

2. **Register in `_reducers/root.ts`** — import and add to the `combineReducers({...})` map.

3. **Add a selector** in `frontend/src/_selectors/myThing.ts` (memoized via `reselect`):
   ```ts
   import { createSelector } from 'reselect'
   import { RootState } from '../_helpers/store'

   export const selectMyThings = (s: RootState) => s.myThing
   export const selectMyThingById = (id: number) =>
       createSelector(selectMyThings, all => all[id])
   ```

4. **Re-export from the selector barrel** in `frontend/src/_selectors/index.ts` if you want it in the main re-export.

5. **Write the thunk** in `frontend/src/_actions/myThing.ts`:
   ```ts
   export const fetchAndStoreMyThings = (...): AppThunk => async (dispatch) => {
       const items = await fetchMyThings(...)
       dispatch(myThingSlice.actions.set(items))
   }
   ```

6. **Use in components** — `useSelector(selectMyThings)` to read, `useDispatch()(fetchAndStoreMyThings(...))` to fetch.

## How to add a new SPA route

1. **Add a `<Route>`** in `frontend/src/appContent/AppBasicRoutes.tsx`:
   ```tsx
   <Route path='/my-page' component={MyPageProvider} />
   ```
   Put it before the catch-all `<Route path='/'>` block.

2. **Add a menu entry** in `frontend/src/appHeader/routes.ts` — push an object with `{label: 'הדף שלי', path: '/my-page', ...}`. Mirror an existing entry.

3. **Build the page** under `frontend/src/myPage/`:
   - `MyPageProvider.tsx` — fetches data via thunks and selectors
   - `MyPageView.tsx` — pure render

4. **Auth/role guarding** — there's no built-in route guard; gate inside the component (check `useSelector(getCurrentUser)`, return early to redirect).

5. **Verify** — `npm run dev`, click through to `/my-page`. The fallback Laravel route serves the SPA, so deep-linking works automatically.

## How to add a new dialog

1. **Register a `DialogName`** in `frontend/src/dialogs/types.tsx` (the enum at the top of the file).

2. **Add the component** under `frontend/src/dialogs/MyDialog/MyDialog.tsx`.

3. **Lazy-load it** in `frontend/src/dialogs/DialogsProvider.tsx` — add a `case DialogName.MyDialog: return <MyDialog />`.

4. **Open / close** from elsewhere:
   ```ts
   import { openDialog, closeDialog } from '../_actions/dialogs'
   dispatch(openDialog(DialogName.MyDialog, { someData }))
   dispatch(closeDialog(DialogName.MyDialog))
   ```

5. **Read dialog data** in your dialog component via `useSelector(selectDialogData(DialogName.MyDialog))`.

## How to add a new admin operation

1. **Add a method** to `app/Http/Controllers/AdminController.php` (returns plain text/JSON — most existing admin methods just `echo` or return strings).

2. **Add the route** in `routes/web.php` under the `/admin/*` block. Most admin routes have **no explicit middleware** — add `->middleware('admin')` if you actually want the gate enforced.

3. **For destructive ops**: prefix the URL with `danger-` (convention used by `switchGroups`) and document the recovery path in `ADMIN_OPERATIONS.md`.

4. **For ops that mutate scores**: trigger `CalculateSpecialBets::execute(...)` (special bets) and/or `UpdateLeaderboards::handle(...)` to keep leaderboards consistent.

5. **For ops that need admin-side UI**: add a control in `frontend/src/admin/` (the `admin` Redux slice + reducer already exists for admin-tool state).

## How to add a new migration

1. **Create the file** — manually (since `php artisan` isn't always set up in this dev env):
   ```
   database/migrations/YYYY_MM_DD_HHMMSS_describe_your_change.php
   ```
   File name format matters; Laravel runs them in lex order.

2. **Mirror the existing style** — a `class DescribeYourChange extends Migration` with `up()` and `down()`.

3. **Use `Schema::table` for changes** to existing tables, `Schema::create` for new tables.

4. **Avoid destructive ops without a `down()`** — `dropColumn`, `dropTable`, `dropUnique` etc. should all be reversed.

5. **Foreign keys** — the convention in this codebase is `foreignId(...)` without explicit cascade constraints. Match the existing style; don't add DB-level cascades unless you also update existing data.

6. **Index changes** — name your indexes (`->unique([...], 'my_index_name')`) so `down()` can drop them.

7. **Run** `php artisan migrate` to apply.

8. **Update `DATABASE_SCHEMA.md`** — add the new table / column to the right section and bump the evolution timeline.

## How to extend tournament config

`tournament.config` is a free-form JSON column. Adding fields:

1. **Backend — write side**
   - Add a new endpoint or extend `TournamentController::updateTournamentPreferences` / `updateTournamentScores`.
   - Validate input against allowed values; reject if tournament is not `STATUS_INITIAL` (if your field is scoring-related).

2. **Backend — read side**
   - Wherever you need the value, use `data_get($tournament->config, 'your.path', $default)`.

3. **Defaults**
   - Add to `config/defaultScore.php` if it's a score-related default.
   - Otherwise add to `CreateTournament::handle` where the tournament is first created.

4. **Frontend — types**
   - Extend `frontend/src/types/tournament.ts` (`TournamentConfig` interface).

5. **Frontend — UI**
   - Add a form control in `frontend/src/tournamentConfig/` (likely under `scores/` or a new sibling).
   - Wire it to a thunk that calls the update endpoint.

6. **GOTCHAS check**
   - Will turning your field off mid-tournament break anything? See how `specialQuestionFlags` handles its post-start cleanup (`Tournament::deleteDeprecatedQuestionBets`).

## How to wire a scheduled task

`Kernel::schedule()` is empty. To run `UpdateOngoingCompetitions` periodically:

1. **Local dev** — add a system cron entry that runs `php artisan schedule:run` every minute, and add to `app/Console/Kernel.php@schedule`:
   ```php
   $schedule->command(\App\Console\Commands\UpdateOngoingCompetitions::class)->everyTenMinutes();
   ```

2. **Heroku** — use the **Heroku Scheduler addon** to run `php artisan ongoing:update` (or whatever your command's signature is) on a schedule.

3. **No-queue alternative** — since `QUEUE_DRIVER=sync`, calling the action in-request blocks; if the data sync is slow, you may want to start a background worker dyno + queue driver before scheduling heavy work.
