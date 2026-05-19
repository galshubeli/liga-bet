# Auth and Permissions

Two layers of authorization: **site-wide** (`User.permissions`) and **per-tournament** (`TournamentUser.role`). The two are independent — a `TYPE_USER` site account can still be a tournament `admin` on a tournament they created.

## Site-wide Permissions — `User.permissions`

Constants in `app/User.php`:

| Constant | Value | Meaning |
|---|---|---|
| `TYPE_ADMIN` | `2` | Full site admin. Can use all `/admin/*` endpoints, manage competitions, complete matches, etc. |
| `TYPE_TOURNAMENT_ADMIN` | `1` | Can create new tournaments. Otherwise a regular user. |
| `TYPE_USER` | `0` | Default. Can join tournaments via code, place bets, etc. |
| `TYPE_MONKEY` | `-1` | Non-human; auto-bets. Created by `AdminController::createMonkey`. |

Predicates: `isAdmin()`, `isTournamentAdmin()`, `hasTournamentAdminPermissions()` (admin OR tournament-admin), `isMonkey()`.

## Per-Tournament Roles — `TournamentUser.role` (UTL)

Constants in `app/TournamentUser.php` with a numeric permission ladder (`TournamentUser::permissions($role)`):

| Constant | Value | Permission level | Meaning |
|---|---|---|---|
| `ROLE_ADMIN` | `'admin'` | 3 | Tournament owner / full control |
| `ROLE_MANAGER` | `'manager'` | 2 | Can manage UTLs |
| `ROLE_CONTESTANT` | `'contestant'` | 1 | Regular participant; can bet |
| `ROLE_NOT_CONFIRMED` | `'not_confirmed'` | 0 | Joined; awaiting approval |
| `ROLE_REJECTED` | `'rejected'` | -1 | Denied entry |
| `ROLE_MONKEY` | `'monkey'` | -2 | Auto-bet bot |

Predicates:
- `isConfirmed()` — `permissions > not_confirmed` (so admin/manager/contestant)
- `isRegistered()` — `permissions ≥ not_confirmed` (excludes rejected/monkey)
- `isCompeting()` — `isConfirmed() || isMonkey()` — i.e. shows on leaderboards
- `hasManagerPermissions()` — `permissions ≥ manager`

`Tournament::competingUtls()` and `confirmedUtls()` use these.

## Middleware

Registered in `app/Http/Kernel.php@routeMiddleware`:

| Alias | Class | Behavior |
|---|---|---|
| `auth` | `App\Http\Middleware\Authenticate` | Standard Laravel — session-authenticated user must exist |
| `guest` | `App\Http\Middleware\RedirectIfAuthenticated` | Inverse — for `/login`, `/register`, password-reset views |
| `admin` | `App\Http\Middleware\AdminMiddleware` | Throws `JsonException(403)` unless `Auth::user()->permissions === User::TYPE_ADMIN` |
| `confirmed_user` | `App\Http\Middleware\ConfirmedTournamentUser` | Reads `tournamentId` route param; throws 401 unless `Auth::user()->isConfirmed($tournamentId)` |
| `tournament_admin` | `App\Http\Middleware\TournamentAdmin` | Reads `tournamentId`; calls `EnsureTournamentAdmin::validate(user, tournamentId)` |
| `tournament_manager` | `App\Http\Middleware\TournamentManager` | Reads `tournamentId`; requires UTL with `hasManagerPermissions()`, else 403 |
| `pre_tournament_bets_closed` | `App\Http\Middleware\PreTournamentBetsClosedMiddleware` | Refuses access while pre-tournament bets are still open. **Defined but not used in any route** |

Global middleware (every request) includes `Fruitcake\Cors\HandleCors`, `TrimStrings`, `TrustProxies`, and the maintenance-mode check.

The `web` middleware group adds `EncryptCookies`, `StartSession`, `VerifyCsrfToken`, and `SubstituteBindings`. The `api` group adds `throttle:60,1` and `bindings`. Note that **most `/api/*` routes are defined in `routes/web.php`**, so they use the `web` group (sessions + CSRF) — not the `api` group.

## Registration — `RegisterController`

`Auth::routes()` registers the default `POST /register`. The custom `RegisterController::create()`:

1. Validates `email` (required, unique, valid email, ≤255 chars) and `password` (required, ≥4 chars, confirmed).
2. **Auto-promotes the very first user to `TYPE_ADMIN`** (the `User::exists()` check is false).
3. If the email is in `email_of_unregistered_tournament_admin`, promotes to `TYPE_TOURNAMENT_ADMIN` and deletes the invitation row.
4. Otherwise sets `TYPE_USER`.
5. Logs the user in.

Min password length is **4 characters** — weak but matches the existing `'min:4'` rule.

## Login — `LoginController`

Standard Laravel `AuthenticatesUsers` trait. Username field overridden to `email` (`username()` returns `'email'`). Redirect after login: `/home`. Logout: `GET /logout`.

## Password Reset — `CustomResetPasswordController`

Custom implementation (`app/Http/Controllers/Auth/CustomResetPasswordController.php`):

1. `POST /send-reset-password` (`submitForgetPasswordForm`)
   - Validates email exists.
   - Generates a 64-char random token (reuses an existing token within 10 minutes if present).
   - Stores `(email, token, created_at)` in `password_reset_tokens`.
   - Sends email via `Mail::send('email.reset-password', ...)` — SMTP through SendinBlue.

2. `GET /reset-password/${token}` (`resetPasswordUsingToken`)
   - Checks token exists and is < 60 minutes old.
   - Generates a new random 10-char password, hashes, writes to user.
   - Deletes the reset row.
   - Logs the user in.
   - Redirects to `/?reset-password`.

> **Note**: the new password is generated, not user-supplied. The user is logged in and expected to change it via `PUT /api/user/set-password` from the SPA.

## FCM Push Notifications

- `POST /register-token` (`HomeController::registerFCMToken`) — body is the raw FCM token string. Saved to `users.fcm_token`. Must be re-called on every login (tokens rotate).
- `User::sendNotifications($title, $body)` uses the `App\Providers\AppServiceProvider`-bound `FcmClient` to push a notification to the stored token. No-op if `fcm_token` is null.
- The only consumer in code is `app/Notifications/SendCloseCallsMatchBetsNotifications.php` (close-call match bet reminders). Triggered by `/notifications/send`, **whose controller method `sendAll` doesn't exist** — so this notification flow is effectively dormant unless wired up another way.

## Tournament Join Flow

`POST /api/user/utls` (`UserController::joinTournament`):

1. Validates `name` (≥ 2 chars) and `code` (tournament code).
2. Looks up the tournament by code; rejects if not `STATUS_INITIAL` (must be pre-start).
3. Rejects if the user already has a UTL on this tournament.
4. Caps non-admins at **3 tournaments per competition** (`User::canJoinAnotherTournament`).
5. Rejects if `name` is already taken in this tournament.
6. `Tournament::createUTL($user, $name)` creates the UTL.
   - Role: `ROLE_NOT_CONFIRMED` unless `preferences.auto_approve_users` is true → `ROLE_CONTESTANT` immediately.

`DELETE /api/user/utls/{tournamentId}` (`UserController::leaveTournament`):
- Only allowed while role is `not_confirmed` or `rejected`. Confirmed contestants can't leave.

## Tournament-Level Approvals

`TournamentUserController` (the `manage/utls` block, gated by `tournament_manager` middleware):
- `GET /api/tournaments/{id}/manage/utls/` — list UTLs
- `PUT /api/tournaments/{id}/manage/utls/{utlId}` — change role (approve, promote to manager, etc.)
- `DELETE /api/tournaments/{id}/manage/utls/{utlId}` — remove

`UserController::updateUTL` (`PUT /api/user/utls/{tournamentId}`) lets a user change their **own** display name.

## Setting Passwords / Initial Password

- `GET /set-password` — view for users without a password (e.g. those created indirectly).
- `PUT /api/user/set-password` (`UserController::setPassword`) — authenticated user sets their own password.

## Tournament-Admin Permission Grants

- `POST /admin/grant-tournament-admin` (`AdminController::grantTournamentAdminPermission`) — site admins promote a user to `TYPE_TOURNAMENT_ADMIN`.
- `POST /admin/set-permission` (`AdminController::setPermission`) — set site-wide `User.permissions` directly.

## CSRF and Session

- All `/api/*` routes go through the `web` middleware group, which means **CSRF tokens are required** for state-changing requests (POST/PUT/DELETE). The SPA gets the token from the `<meta name="csrf-token">` injected by the Blade template and includes it as `X-CSRF-TOKEN`.
- Sessions are cookie-based, file-driver by default (`SESSION_DRIVER=file`, `SESSION_LIFETIME=120` minutes).

## CORS

`Fruitcake\Cors\HandleCors` is in the global middleware stack. Config is at `config/cors.php` (Laravel default) — currently allows the SPA's origin to call the API.

## Common Pitfalls

- **First user becomes admin.** Be careful when standing up new environments — register your intended admin first.
- **Tournament-admin invitations are pre-registered emails**, not invite tokens. Add the email to `email_of_unregistered_tournament_admin` before they sign up.
- **The fallback route requires `auth`** — unauthenticated requests to any SPA route hit the login redirect.
- **`PUT /api/tournaments/{id}/scores`** has no explicit middleware in `routes/web.php`, but `TournamentController::updateTournamentScores` checks `validateUpdatePermissions` (user owns the tournament + `User.can_edit_score_config`). See `app/Http/Controllers/TournamentController.php`.
- **Scoring config can only be edited while tournament is `STATUS_INITIAL`** — guarded in-controller. See GOTCHAS.md.
