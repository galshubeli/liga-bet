# Hosting & Local Setup — Research

Where this Laravel + React app can run, which free tiers actually exist in 2026, and how to bring it up locally.

Companion docs: [WORLD_CUP_2026.md](WORLD_CUP_2026.md), [FOOTBALL_API.md](FOOTBALL_API.md). For deeper config/deploy details, see (planned) `CONFIG_AND_DEPLOYMENT.md` in [DOCS_INDEX.md](DOCS_INDEX.md).

---

## 1. Stack constraints

A host has to satisfy all of these:

| Need | Source |
|---|---|
| PHP 8.1+ runtime serving Laravel from `public/` | `composer.json` (`php = ^8.1.23`), `Procfile` (`heroku-php-apache2`) |
| Node build step (webpack via Mix) | `frontend/package.json`, `webpack.mix.js` |
| MySQL (Postgres also possible) | `config/database.php`, `.env.example` |
| Composer install at deploy | standard Laravel |
| Cron/scheduler for the crawler | `php artisan schedule:run` — crawler routines like `UpdateCompetitionScorers` |
| Persistent disk OR DB session driver | `SESSION_DRIVER=file` today (in `.env.example`) |

This set rules a lot of "free" options in and out.

---

## 2. Per-platform verdict

### 2.1 Vercel — No

Vercel does not run PHP. It is static + Node.js serverless only. The React build could deploy there, **but the Laravel API has nowhere to live on Vercel**. Disqualified for the backend. Only relevant if frontend/backend get split — and they aren't today; Laravel serves the SPA from `public/`.

### 2.2 Railway — Yes, but no real free tier anymore

- Auto-detects Laravel, spins up MySQL/Postgres via plugins. Best developer experience of the three modern PaaS options.
- **Free tier was removed in 2023.** New accounts get a **one-time $5 trial credit (valid 30 days)** to test. After trial: **Hobby plan ~$5/mo + usage**. MySQL counts against the same credit pool.
- The `heroku-php-apache2` Procfile is replaced automatically by Railway's nixpacks build.

### 2.3 Render — Best free option, with caveats

- **Only host with a real free tier in 2026, no credit card required.**
- Free web service spins down after 15 min idle (cold starts ~30s).
- **Postgres on Render is $7/mo minimum** — they killed the free DB tier. Pair it with an external free DB (PlanetScale / Supabase / Aiven) to stay free.
- Auto-detects PHP. Closest to the Heroku workflow this app was originally built for.

### 2.4 Fly.io — Possible but more work

- No PHP auto-detect → requires a custom Dockerfile.
- New accounts get a **one-time $5 trial credit**, then paid.
- Globally distributed VMs. Overkill for this app.
- Credit card required.

### 2.5 Heroku — Original target, paid now

- The `Procfile` (`web: vendor/bin/heroku-php-apache2 public/`) confirms this app **was deployed on Heroku**.
- **Free tier was killed Nov 2022.** Cheapest path now: Eco dyno **$5/mo** + JawsDB/ClearDB MySQL ~$5–10/mo.
- Zero migration friction from the current repo state.

### 2.6 Shared PHP hosts (InfinityFree, 000webhost, AwardSpace…) — Free, but cramped

- Free, supports PHP + MySQL out of the box.
- Limited CPU/memory, no SSH on the free tier of most, no `composer install` over CLI on some, no scheduler for the crawler.
- Realistic for a static UI demo, **not** for live crawling/scoring.

### 2.7 Laravel Cloud — No free tier

Launched in 2024, pay-as-you-go from day one.

---

## 3. Free combinations that actually work for testing

The realistic answer for "free, today, for a quick test":

| Combo | Free? | Trade-off |
|---|---|---|
| **Render free web service + PlanetScale Hobby MySQL** | Yes (no CC) | Web service sleeps after 15 min; cold starts ~30s; PlanetScale needs a connection-string swap |
| **Render free web service + Supabase free Postgres** | Yes (no CC) | Same sleep; requires `DB_CONNECTION=pgsql` and re-running migrations on Postgres |
| **Railway $5 trial credit + Railway MySQL** | Yes for 30 days | Best DX; expires after trial; CC required afterward |
| **Fly.io $5 trial + Fly Postgres** | Yes for ~1 month | Needs Dockerfile work; CC required |
| **InfinityFree (or similar shared PHP host)** | Yes, indefinitely | No scheduler, no SSH, no composer; only useful for demoing the UI |

For a tight free demo deployment with the crawler running, **Render + PlanetScale** is the cleanest answer. Render's idle-sleep is fine since a cron-job.org free trigger can keep it warm during tournament hours.

For real continuous hosting once you accept paying, **Railway is the best DX** (~$5/mo + ~$3 DB usage) and **Render is the closest to the existing Heroku workflow** (~$7 web + $7 DB = ~$14/mo).

---

## 4. Local setup — yes, easily

Standard Laravel local bring-up:

```bash
# 1. Backend
cp .env.example .env
# edit .env: set DB credentials; APP_KEY will be generated below
composer install
php artisan key:generate
php artisan migrate
php artisan serve                  # http://localhost:8000

# 2. Frontend (second terminal)
cd frontend && npm install && npm run dev   # webpack --watch

# 3. MySQL — pick one:
#    a) Docker:  docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=secret mysql:8
#    b) Local install on your machine
#    c) SQLite shortcut: set DB_CONNECTION=sqlite, touch database/database.sqlite

# 4. Crawler — manual trigger to test
php artisan tinker
> app(App\Actions\YourCrawlerAction::class)->execute();
```

### 4.1 Setup gotchas

1. **Leaked SMTP credentials**: `.env.example` ships with a real-looking SendinBlue SMTP password and a Gmail address — that account should be considered compromised; rotate before any real deploy.
2. **Leaked API tokens**: `config/api.php:6-7` has hardcoded football-data.org tokens (see `FOOTBALL_API.md §5.1`).
3. **No frontend/backend split**: the webpack build outputs into `public/` which Laravel serves. Don't try to deploy frontend and backend separately (e.g. Vercel for FE + Render for BE) without restructuring asset paths and CORS.

---

## 5. Bottom line

- **Best free option to test**: **Render free web service + PlanetScale (or Supabase) free DB.** Only path that's free indefinitely and runs the live crawler.
- **Best cheap-paid option with great DX**: **Railway** (~$5–10/mo all-in).
- **Closest to current setup**: **Heroku Eco** (~$10–15/mo all-in) — the existing Procfile already targets it.
- **Don't use Vercel** for the Laravel side — it doesn't run PHP.
- **Local works out of the box** with composer + node + a MySQL (or SQLite shortcut). About 10 minutes to first request.

---

## 6. Sources

- [Render free-tier platforms 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
- [Railway vs Render vs Fly.io for solo devs 2026](https://devtoolpicks.com/blog/railway-vs-render-vs-fly-io-solo-developers-2026)
- [Railway pricing review 2026](https://www.srvrlss.io/provider/railway/)
- [Render vs Railway 2026](https://encore.dev/articles/render-vs-railway)
- [Fly.io vs Railway 2026](https://thesoftwarescout.com/fly-io-vs-railway-2026-which-developer-platform-should-you-deploy-on/)
