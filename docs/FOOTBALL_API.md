# Football Data API — Research & Recommendations

Snapshot of the football data sources used by LigaBet, a live test of the current API against the FIFA World Cup 2026 feed, and a comparison of free alternatives.

Companion doc: [WORLD_CUP_2026.md](WORLD_CUP_2026.md). See also [BACKEND_INTERNALS.md](BACKEND_INTERNALS.md) for the crawler internals.

---

## 1. What the repo uses today

Two data sources, used for different jobs.

### 1.1 Primary: football-data.org v4

Used for the canonical competition / fixture / standings / scorers feed.

- Base URL: `https://api.football-data.org/v4/` — `config/api.php:4`
- Auth: `X-Auth-Token` header — `app/DataCrawler/Crawler.php:151`
- Tokens: hardcoded in `config/api.php:6-7` (see [§5 Security notes](#5-security-notes))
- Throttling: `API_THROTTLING_MINUTES`, default `5` — `config/api.php:5`
- Token pooling: `api.api_token` is comma-joined, then **shuffled and retried** across tokens — `app/DataCrawler/Crawler.php:149-152`. This lets multiple free-tier tokens round-robin past the 10 req/min limit.

Endpoints consumed:

| Endpoint | Where | Purpose |
|---|---|---|
| `competitions/{id}/standings` | `Crawler.php:164, 280` | Groups + teams + ranks |
| `competitions/{id}/matches` | `Crawler.php:185` | Fixture list with stages + groups |
| `competitions/{id}/scorers?limit=300` | `Crawler.php:228` | Top scorers |
| `teams/{teamId}?limit=300` | `Crawler.php:269` | Squad lookup |

### 1.2 Secondary: 365scores web endpoints

Scraped (no API key) for goals, squads, scorers, and live game state. Not an official API — relies on `User-Agent` rotation:

| URL | Where | Purpose |
|---|---|---|
| `https://webws.365scores.com/web/game/?...&gameId=...` | `Crawler.php:247` | Per-game detail (goals, events) |
| `https://webws.365scores.com/web/squads/?...&competitors=...` | `Crawler.php:313` | Squad data |
| `https://webws.365scores.com/web/stats/?...&competitions=...&competitors=...` | `Crawler.php:435` | Team stats |
| `https://webws.365scores.com/web/games/current/?...&competitions=...` | `Crawler.php:514` | Latest/in-progress games |

This is fragile (no contract, can break when 365scores changes their frontend) but free and high-detail.

---

## 2. Live test — football-data.org against WC 2026

Tested with the token already in `config/api.php` on 2026-05-19.

### 2.1 Competition discovery

```
GET /v4/competitions
→ FIFA World Cup found: code=WC, id=2000, plan=TIER_ONE, area=World
```

### 2.2 Current season

```
GET /v4/competitions/2000
→ currentSeason.id = 2398
→ 2026-06-11 → 2026-07-19
→ 23 seasons total in feed (back to 1998)
```

### 2.3 Matches feed

```
GET /v4/competitions/2000/matches → HTTP 200, 104 matches
```

Stage breakdown returned by the API:

| API stage | Count | Matches the regulations doc (§1.4 of WORLD_CUP_2026.md) |
|---|---|---|
| `GROUP_STAGE` | 72 | yes |
| `LAST_32` | 16 | yes (new round) |
| `LAST_16` | 8 | yes |
| `QUARTER_FINALS` | 4 | yes |
| `SEMI_FINALS` | 2 | yes |
| `THIRD_PLACE` | 1 | yes |
| `FINAL` | 1 | yes |

Groups returned: `GROUP_A`, `GROUP_B`, …, `GROUP_L` — all 12.

**These stage strings already match `app/Enums/GameSubTypes.php` exactly** (`LAST_32`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `THIRD_PLACE`, `FINAL`). Zero translation needed on that axis.

Knockout matches today come back as `homeTeam: null` / `awayTeam: null` — they'll populate as the bracket resolves. That's the trigger window for the `ResolveRoundOf32` action proposed in WORLD_CUP_2026.md §2.2.C.

### 2.4 Scorers feed

```
GET /v4/competitions/2000/scorers?limit=10 → HTTP 200
→ count: 0 (tournament hasn't started)
→ season window confirmed 2026-06-11 → 2026-07-19
```

Endpoint is alive and returning the right season; will populate during the tournament.

### 2.5 Rate limit (free tier)

```
Response header: x-requests-available-minute: 7
```

Free-tier ceiling = **10 requests/minute**. Headers show remaining-in-current-window.

---

## 3. Free alternatives compared

| API | Free tier | WC 2026 coverage | Auth | Notes |
|---|---|---|---|---|
| **football-data.org v4** *(current)* | 10 req/min, 12 competitions, **delayed** scores | Full — 104 fixtures with stages + groups | API token (free signup) | Already integrated. Live (undelayed) scores require €12/mo upgrade. |
| **openfootball/worldcup.json** | Unlimited, static JSON | Full WC 2026 fixtures, public domain | None | Static — no live scores. Ideal for one-time seeding. |
| **API-Football** (api-sports.io) | **100 req/day** | Yes (`league=1`, `season=2026`) | RapidAPI key | 100/day is too tight for live polling. Resets at 00:00 UTC. |
| **TheSportsDB** | 30 req/min | Partial, crowd-sourced | None / Patreon | Accuracy concerns; community-maintained. Good for team logos/images. |
| **Sportmonks** | None (paid only) | Full premium "World Cup API" | API token | €69/mo Special; €129/mo All-In with xG / Pressure Index / predictions. |
| **Live-Score-API / Statorium / worldcupapi.com** | None / signup-walled | Yes | Token | All paid. |
| **StatsBomb Open Data** | Free, GitHub-hosted | Historical only, not WC 2026 | None | Event-level analysis data. Not relevant for live betting flow. |

### 3.1 Paid upgrade paths on football-data.org

If/when we outgrow the free tier:

| Plan | Price | Rate | What's added |
|---|---|---|---|
| Free w/ Livescores | €12/mo | 20/min | **Undelayed live scores** (still 12 competitions) |
| Free + Deep Data | €29/mo | 30/min | Line-ups, subs, goal scorers, cards, squads |
| Standard | €49/mo | 60/min | 30 competitions |
| Advanced | €99/mo | 100/min | 50 competitions |
| Pro | €199/mo | 120/min | 100 competitions |

Same API, same code path — only an env-var swap.

---

## 4. Recommendation

### Verdict

**Stick with the current API — football-data.org v4.** It's the best free option for this app by a wide margin. Supplement it with `openfootball/worldcup.json` as a one-time seed source.

### Reasons, in order of weight

1. **Schema-perfect fit.** The API returns stage labels (`LAST_32`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `THIRD_PLACE`, `FINAL`) and group labels (`GROUP_A`…`GROUP_L`) that are **byte-identical** to `app/Enums/GameSubTypes.php` and the 12-group structure in [WORLD_CUP_2026.md](WORLD_CUP_2026.md). Nothing else compared comes pre-aligned like that.
2. **Already integrated and tested.** All 104 WC 2026 fixtures come back on a free-tier call today (see [§2 Live test](#2-live-test--football-dataorg-against-wc-2026)). Zero migration cost. `Crawler.php` already speaks the dialect.
3. **Rate budget is fine.** Free = 10 req/min. With `API_THROTTLING_MINUTES=5`, full crawls run ≤12×/hour. One `/matches` call covers all 104 games. Token pooling in `Crawler.php:149` lets us add free tokens if a real squeeze appears.
4. **Clean paid escape hatch.** If product later wants undelayed live scores: €12/mo, same code path, env-var change. No re-architecture.
5. **openfootball complements, doesn't replace.** Static, no-key, public-domain JSON for the **48 teams, 12 groups, and 104 game shells** at seed time — keeps rate budget for live updates.
6. **365scores stays as-is** for goal/scorer/squad detail (`Crawler.php:247, 313, 435, 514`).

### Why not the alternatives

| Alternative | Disqualifier |
|---|---|
| **API-Football** | 100 req/day kills live polling — exhausted in under an hour at our crawl cadence. |
| **TheSportsDB** | Crowd-sourced data, accuracy risk that doesn't fit a betting/scoring application. |
| **openfootball/worldcup.json** | Static — no live scores. Useful as a *seeder*, not a replacement for the live feed. |
| **Sportmonks / Statorium / worldcupapi.com / Live-Score-API** | All paid, no free tier worth using. |
| **StatsBomb Open Data** | Historical event data only — not a live fixtures/results feed. |

The only honest case for switching would be wanting **xG / predictions / Pressure Index** data → Sportmonks at €69–129/mo. That is a product decision, not an API-quality one.

### Upgrade trigger

When product wants undelayed live scores during the tournament, bump to football-data.org's **€12/mo Livescores tier** — pure env-var change, no code.

---

## 5. Security notes

### 5.1 Hardcoded API tokens

`config/api.php:6-7` ships **two tokens committed in git**. Move to `.env`:

```php
// config/api.php
return [
    'path' => env('FOOTBALL_DATA_API_URL', 'https://api.football-data.org/v4/'),
    'throttling_minutes' => env('API_THROTTLING_MINUTES', 5),
    'api_token' => env('FOOTBALL_DATA_API_TOKEN', ''),
];
```

…and add to `.env.example`:

```
FOOTBALL_DATA_API_URL=https://api.football-data.org/v4/
FOOTBALL_DATA_API_TOKEN=
API_THROTTLING_MINUTES=5
```

The shuffle-and-retry logic in `Crawler.php:149-152` continues to work — `FOOTBALL_DATA_API_TOKEN` can hold a comma-separated list of tokens for round-robin pooling.

Rotate the existing tokens once they're out of source control: they've been public in the repo for ~3 years (see `composer.json` timestamps in the file tree).

### 5.2 365scores reliance

The crawler's 365scores path has no contract — it can break at any time when 365scores changes their frontend. Two mitigations worth considering during the WC 2026 prep window:

- **Telemetry**: log non-200 / parse-fail responses from `Crawler.php:247-514` paths and surface them in admin operations dashboards.
- **Fallback ladder**: if 365scores parsing fails, fall back to football-data.org's `events` endpoint (Deep Data tier, €29/mo) — same data at lower fidelity, but contractual.

---

## 6. Action items for WC 2026

| # | Task | Effort | Blocks |
|---|---|---|---|
| 1 | Move API tokens to `.env`, rotate the leaked ones | XS | nothing (do anytime) |
| 2 | Confirm the WC 2026 seeder pulls from `openfootball/worldcup.json` for the 104 game shells | S | WC 2026 launch |
| 3 | Add the `ResolveRoundOf32` action that listens for "all 72 group-stage games done" and fills R32 team IDs via Annex C — see WORLD_CUP_2026.md §2.2.C | M | R32 betting flow |
| 4 | Audit the crawler's stage / sub_type mapping — the football-data.org `LAST_32` value should round-trip cleanly into `Game.sub_type` (matches `GameSubTypes::LAST_32`) | XS | item 3 |
| 5 | Test the scorers endpoint mid-tournament; cross-check against 365scores (recent commit `9f3b9d9` already adjusted penalty-goal handling) | S | scorer special bets |
| 6 | Decision: stay on free tier (90-second delayed scores) or upgrade to €12/mo Livescores before tournament start | — | product call |

---

## 7. Sources

- [football-data.org pricing](https://www.football-data.org/pricing)
- [openfootball/worldcup.json (GitHub)](https://github.com/openfootball/worldcup.json)
- [API-Football rate limit explainer](https://www.api-football.com/news/post/how-ratelimit-works)
- [API-SPORTS WC 2026 guide](https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports)
- [Sportmonks World Cup API](https://www.sportmonks.com/football-api/world-cup-api/)
- [Free Football APIs in 2026 — TheStatsAPI](https://www.thestatsapi.com/blog/free-football-api-alternatives)
