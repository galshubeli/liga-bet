# Config and Deployment

How the app is configured, packaged, and deployed. Plus how to run it locally.

## Config Files (`config/`)

Standard Laravel layout. Each file is short — read the file directly if you need every key.

| File | Purpose |
|---|---|
| `app.php` | App name, version (hardcoded `3.3.4`), env, debug, URL, timezone, locale, providers. **The `version` here is what's appended to `appMain.js?v=...` in the SPA template** |
| `auth.php` | Guards (`web` session + `api` token), Eloquent user provider, password reset (60-min token, `password_reset_tokens` table) |
| `database.php` | MySQL / PostgreSQL / SQLite / SQL Server. Defaults to MySQL, charset `utf8mb4`, collation `unicode_ci`. Redis predis client |
| `mail.php` | SMTP via SendinBlue. From: `ligabettzafon@gmail.com`, "Liga ב'" |
| `services.php` | Stripe/SES/Sparkpost/Mailgun placeholders — currently unused |
| `cache.php`, `session.php`, `queue.php`, `logging.php`, `broadcasting.php`, `filesystems.php`, `hashing.php`, `view.php` | Laravel defaults |
| `prequel.php` | Config for `protoqol/prequel` — in-app DB browser at `/prequel` (dev tool) |
| **`defaultScore.php`** | **The default tournament scoring config**. See `BET_SCORING.md`. Copied into `Tournament.config.scores` on creation |
| **`bets.php`** | Bet locking + forced answers. `lockBeforeSeconds`, `lockBetsBeforeTournamentSeconds`, `mvp`, `topAssists` |
| **`api.php`** | Football-Data.org API base URL (`https://api.football-data.org/v4/`) and **two hardcoded API tokens**. Throttling default 5 minutes |

### `config/defaultScore.php` (full schema)

See `BET_SCORING.md`. The keys mirror `tournament.config.scores.*`.

### `config/bets.php`

```php
return [
    'lockBeforeSeconds' => 60*60*env('BETS_LOCK_BET_BEFORE_HOURS', 0),
    'lockBetsBeforeTournamentSeconds' => 60*60*env('BETS_LOCK_BETS_BEFORE_TOURNAMENT_HOURS', 0),
    'mvp' => env('MVP', null),
    'topAssists' => env('TOP_ASSISTS_PLAYER', null),
];
```

### `config/api.php`

```php
return [
    'path' => "https://api.football-data.org/v4/",
    'throttling_minutes' => env('API_THROTTLING_MINUTES', 5),
    'api_token' => "<hardcoded-token-1>",
    'api_token_2' => "<hardcoded-token-2>",
];
```

> **API tokens are hardcoded in source**, not loaded from env. See `GOTCHAS.md`.

## Environment Variables

Source: `.env.example`. Every var the app reads:

| Var | Purpose | Consumed by |
|---|---|---|
| `APP_NAME` (default `Liga ב'`) | App display name | `config/app.php` |
| `APP_ENV` (`local`/`production`) | Env mode | `config/app.php` |
| `APP_KEY` | Laravel encryption key — must run `php artisan key:generate` | global |
| `APP_DEBUG` | true → detailed errors | `config/app.php` |
| `APP_URL` | Base URL | `config/app.php` |
| `LOG_CHANNEL` (`stack`) | Log driver | `config/logging.php` |
| `DB_CONNECTION` (`mysql`) | DB driver | `config/database.php` |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | DB credentials | `config/database.php` |
| `BROADCAST_DRIVER` (`log`) | Broadcasting | `config/broadcasting.php` |
| `CACHE_DRIVER` (`file`) | Cache backend | `config/cache.php` |
| `SESSION_DRIVER` (`file`), `SESSION_LIFETIME` (120 mins) | Session backend / TTL | `config/session.php` |
| `QUEUE_DRIVER` (`sync`) | **Sync = no queue workers; everything in-request** | `config/queue.php` |
| `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT` | Redis (optional) | `config/database.php` |
| `MAIL_DRIVER` (`smtp`), `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | SMTP via SendinBlue | `config/mail.php` |
| `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER` | Pusher (unused; scaffolding) | `config/broadcasting.php` |
| `MIX_PUSHER_APP_KEY`, `MIX_PUSHER_APP_CLUSTER` | Bridged into front-end Mix bundle | `webpack.mix.js` |
| `BETS_LOCK_BET_BEFORE_HOURS` | Lock individual game bets N hours before kickoff | `config/bets.php` |
| `BETS_LOCK_BETS_BEFORE_TOURNAMENT_HOURS` | Lock group/special bets N hours before tournament start | `config/bets.php` |
| `MVP`, `TOP_ASSISTS_PLAYER` | Override answers for MVP / top assists | `config/bets.php` |
| `API_THROTTLING_MINUTES` (default 5) | Football-Data.org throttle | `config/api.php` |
| `SENTRY_AUTH_TOKEN` | For sourcemap upload during frontend build | `frontend/webpack.config.js` |

> `.env.example` ships with the **real** SMTP password and the API tokens are hardcoded in source. Treat these as already-leaked — see `GOTCHAS.md`.

## Composer Dependencies (`composer.json`)

PHP `^8.1.23` required. Key deps:
- `laravel/framework` ^8.0, `laravel/ui` ^3.0, `laravel/helpers` ^1.5, `laravel/tinker` ^3.0
- `edwinhoksberg/php-fcm` ^1.2 (FCM push)
- `fideloper/proxy` ^4.0
- `fruitcake/laravel-cors` ^2.0
- `guzzlehttp/guzzle` ^7.0.1
- `fzaninotto/faker` ^1.4 (used by `MonkeyAutoBetCompetitionGames`)
- `protoqol/prequel` ^1.22 (in-app DB browser, mounted at `/prequel`)
- `barryvdh/laravel-ide-helper` ^2.12 (`_ide_helper.php` is checked in)

Dev: `phpunit/phpunit` ^10.0, `mockery`, `nunomaduro/collision`, `facade/ignition`.

Run `composer ide-helper` to regenerate `_ide_helper.php`.

## Deployment — Heroku

### `Procfile`
```
web: vendor/bin/heroku-php-apache2 public/
```

Single Heroku web dyno running Apache + PHP, serving `public/`. No worker dyno, no cron addon configured. The console command `UpdateOngoingCompetitions` exists for data sync but isn't scheduled — see `app/Console/Kernel.php` (empty `schedule()`).

### `public/index.php`
Standard Laravel entrypoint. Loads autoloader, bootstraps `app`, handles request → kernel → response. Honors `storage/framework/maintenance.php` for maintenance mode.

### `public/.htaccess`
Apache mod_rewrite:
- Forwards `Authorization` header (so Laravel sees it)
- Strips trailing slashes (301)
- Falls back to `index.php` for any path that isn't a real file — enables Laravel routing + the SPA fallback

### SPA Serving
- `routes/web.php` ends with `Route::fallback(fn() => view('react-app.index'))->middleware('auth')`.
- `resources/views/react-app/index.blade.php` injects:
  - `<meta name="csrf-token" content="{{ csrf_token() }}">`
  - User data (for the SPA to skip the initial `/api/user` round-trip when possible)
  - `<script src="/js/react-app/appMain.js?v={{ config('app.version') }}"></script>`

## Build Systems — there are TWO

### Webpack (the one that matters) — `frontend/webpack.config.js`
- Entry: `frontend/src/index.tsx`
- Output: `public/js/react-app/appMain.js` (+ chunks `chunk.[name].[chunkhash].js`)
- `clean: true` — wipes the output dir on each build
- Loaders: `ts-loader` (TS/TSX), `babel-loader` (JS/JSX), `style-loader` + `css-loader` + `sass-loader` (SCSS), `postcss-loader` with `tailwindcss` + `autoprefixer` (CSS), `@svgr/webpack` (SVG → React component)
- Plugins: `BundleAnalyzerPlugin` (opens a browser tab on build!), `sentryWebpackPlugin` (uploads source maps with `SENTRY_AUTH_TOKEN`), `TsconfigPathsPlugin` (path alias `@/*` → `src/*`)
- `devtool: 'source-map'` — full source maps
- Commands: `npm run dev` (watch), `npm run build` (production)

### Laravel Mix (legacy, likely unused in production) — `webpack.mix.js`
```js
mix.js('resources/assets/js/app.js', 'public/js')
   .sass('resources/assets/sass/app.scss', 'public/css')
```
Compiles a small set of Vue/jQuery assets to `public/js/app.js` and `public/css/app.css`. Predates the React SPA. Not run by any documented build pipeline; safe to ignore unless you find a Blade template referencing `app.js`.

## Storage (`storage/`)

- `storage/logs/` — Laravel log files
- `storage/framework/cache/` — file cache when `CACHE_DRIVER=file`
- `storage/framework/sessions/` — session files when `SESSION_DRIVER=file`
- `storage/framework/maintenance.php` — created when `php artisan down`

No persistent file uploads in `storage/app/public/` for tournaments — all images come from external URLs (team crests from competition API, GIFs from external CDN, etc.).

## Public Assets (`public/`)

- `public/css/` — output of `webpack.mix.js`, plus a few hand-edited files
- `public/js/app.js` — legacy Mix bundle (Vue/jQuery — unused if you're only on the SPA)
- `public/js/react-app/appMain.js` + chunks — the modern SPA
- `public/img/`, `public/static/` — images / fonts / static resources
- `public/vendor/` — third-party CSS/JS (Bootstrap 3.x, jQuery 3.3, Toastr, Font Awesome 4)
- `public/favicon.ico`, `public/worldcup22.ico` — favicons
- `public/robots.txt`, `public/.htaccess`

## CI/CD

**None.** No `.github/workflows/`, `.gitlab-ci.yml`, or similar. Deploys are presumably `git push heroku main` style. No automated tests are run on push.

## Scheduled Tasks

**None active.** `app/Console/Kernel.php` has an empty `schedule()` method. The `UpdateOngoingCompetitions` Artisan command exists (`app/Console/Commands/`) and is the natural candidate for periodic execution — wire it in there or via Heroku Scheduler if you want auto-sync.

## Scripts (`scripts/`)

- `scripts/get_teams_heb_names.py` — one-off Python script for translating team names to Hebrew

## Local Setup

> Marked as **untested** in this docs pass — verify before relying.

```bash
# 1. Install PHP 8.1+, Composer, Node 18+, MySQL (or Postgres / SQLite)

# 2. Install backend deps
cd /home/shubeli/super_res/liga-bet
composer install

# 3. Configure environment
cp .env.example .env
php artisan key:generate
# Edit .env to set DB credentials. Optionally point QUEUE_DRIVER, CACHE_DRIVER to sync/file (default).

# 4. Create DB and run migrations
# (in MySQL) CREATE DATABASE liga_bet;
php artisan migrate

# 5. Install frontend deps and start the dev build
cd frontend
npm install      # also runs patch-package
npm run dev      # watch mode → writes to ../public/js/react-app/

# 6. Run the backend (in a separate terminal)
cd /home/shubeli/super_res/liga-bet
php artisan serve   # http://127.0.0.1:8000

# 7. Open http://127.0.0.1:8000 in a browser.
#    - Register your first user — they auto-promote to TYPE_ADMIN.
#    - Create a competition (currently requires manual SQL or the `CreateCompetition` Action via Tinker).
#    - Create a tournament from the SPA, share the code, etc.
```

Notes:
- **No seeders** — `database/seeders/DatabaseSeeder.php` is empty. The DB starts blank.
- Competitions normally come from the Football-Data.org sync — you need API tokens (already hardcoded in `config/api.php`).
- The SPA can also be opened directly via the dev server if you set up `webpack-dev-server`, but the default config doesn't include the dev-server block — it's `--watch` only.

## Common Tasks

### Regenerate IDE helper
```bash
composer ide-helper
```

### Inspect a tournament's config via tinker
```bash
php artisan tinker
>>> App\Tournament::find(1)->config
```

### Browse the DB in-app
Visit `/prequel` in your browser (in `local` env only) — provided by `protoqol/prequel`.
