# World Cup 2026 — Tournament Format & Integration Notes

Source: FIFA World Cup 2026 Regulations (EN, 98 pages) — https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf

This doc has two halves:

1. **Tournament reference** — what changed in FWC 2026 vs. previous editions, the exact Round-of-32 pairing matrix, and how Annex C resolves the "best 8 of 12 third-placed teams" assignment.
2. **Integration notes** — what the current LigaBet codebase already supports, and what needs to be added to model this tournament.

Cross-refs: [DOMAIN_MODEL.md](DOMAIN_MODEL.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [BET_SCORING.md](BET_SCORING.md), [BACKEND_INTERNALS.md](BACKEND_INTERNALS.md).

---

## Part 1 — Tournament Reference

### 1.1 Headline structural change: 32 → 48 teams

| Aspect | FWC 2022 (and earlier 32-team editions) | FWC 2026 |
|---|---|---|
| Participating teams | 32 | **48** |
| Host countries | 1 | **3 co-hosts (Canada, Mexico, USA)** |
| Groups | 8 of 4 | **12 of 4** |
| Group-stage matches | 48 | **72** |
| First knockout round | Round of 16 | **Round of 32 (new)** |
| Total matches | 64 | **104** (M1–M104) |
| Final squad size | 23 (26 since 2022 emergency rule) | **23–26 (now codified)** |
| Substitutions | 5 in 3 windows + concussion sub | Same |

Slot allocation (FIFA Council, 9 May 2017):

| Confederation | Direct slots | Play-off slots |
|---|---|---|
| AFC | 8 | 1 |
| CAF | 9 | 1 |
| Concacaf | 6 (incl. 3 hosts) | 2 |
| CONMEBOL | 6 | 1 |
| OFC | 1 | 1 |
| UEFA | 16 | 0 |
| **Total** | **46** | **2** (via 6-team Play-Off Tournament) |

Hosts pre-assigned bracket positions: **Mexico → A1, Canada → B1, USA → D1**.

### 1.2 Group stage (Article 12.2–12.5)

- 12 groups labelled A–L, 4 teams each.
- League system: 3 pts win / 1 draw / 0 loss.
- The last two matches of each group kick off **simultaneously**.
- Qualifiers to Round of 32:
  - All **12 group winners** (1A…1L)
  - All **12 runners-up** (2A…2L)
  - **The 8 best 3rd-placed teams** out of 12 (3A…3L → top 8)
  - Total: 32 advance, 16 eliminated.

### 1.3 Equal-points tiebreakers (Article 13)

Applied in order. Step 1 is head-to-head among the tied teams; Step 2 falls back to overall group performance; Step 3 falls back to the FIFA ranking.

**Step 1 — head-to-head among tied teams:**
- a) Points in matches between the tied teams
- b) Goal difference in those matches
- c) Goals scored in those matches

**Step 2 — overall (if still tied):**
- d) Goal difference in all group matches
- e) Goals scored in all group matches
- f) Fair-play conduct score:

  | Card | Penalty |
  |---|---|
  | Yellow | −1 |
  | Indirect red (2 yellows) | −3 |
  | Direct red | −4 |
  | Yellow + direct red | −5 |

  Only one deduction per player/official per match.

**Step 3 — FIFA/Coca-Cola Men's World Ranking:**
- g) Most recent published edition
- h) Previous editions, walking backward until decided

Same procedure (without head-to-head, since the candidates are in different groups) is used to rank the 12 third-placed teams.

### 1.4 Knockout rounds (Article 12.6–12.11, Article 14)

- Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Play-off for third place → Final.
- Tied at 90'? 2 × 15-min extra time, 5-min interval before ET, no interval between halves.
- Still level? Penalty shoot-out.

---

### 1.5 The exact Round of 32 pairing matrix

The 16 R32 matches (M73–M88) fall into three categories.

**Category 1 — 2nd-place vs 2nd-place (4 matches)**

| Match | Pairing |
|---|---|
| M73 | 2A v 2B |
| M78 | 2E v 2I |
| M83 | 2K v 2L |
| M88 | 2D v 2G |

**Category 2 — group winner vs another group's runner-up (4 matches)**

| Match | Pairing |
|---|---|
| M75 | 1F v 2C |
| M76 | 1C v 2F |
| M84 | 1H v 2J |
| M86 | 1J v 2H |

**Category 3 — group winner vs one of the 8 best 3rd-placed teams (8 matches)**

| Match | Winner | Eligible 3rd-place pool |
|---|---|---|
| M74 | 1E | best 3rd of {A, B, C, D, F} |
| M77 | 1I | best 3rd of {C, D, F, G, H} |
| M79 | 1A | best 3rd of {C, E, F, H, I} |
| M80 | 1L | best 3rd of {E, H, I, J, K} |
| M81 | 1D | best 3rd of {B, E, F, I, J} |
| M82 | 1G | best 3rd of {A, E, H, I, J} |
| M85 | 1B | best 3rd of {E, F, G, I, J} |
| M87 | 1K | best 3rd of {D, E, I, J, L} |

Constraint (Article 12.6): **no two teams from the same group can meet in R32.** Each winner's pool excludes its own group and the four groups whose runners-up are already booked in Categories 1–2.

**Bracket flow into R16 (Article 12.7):**

| R16 match | Plays |
|---|---|
| M89 | W74 v W77 |
| M90 | W73 v W75 |
| M91 | W76 v W78 |
| M92 | W79 v W80 |
| M93 | W83 v W84 |
| M94 | W81 v W82 |
| M95 | W86 v W88 |
| M96 | W85 v W87 |

**Quarter-finals (Article 12.8):** M97 = W89 v W90, M98 = W93 v W94, M99 = W91 v W92, M100 = W95 v W96.

**Semis (Article 12.9):** SF1 (M101) = QF A (W97) v QF B (W98); SF2 (M102) = QF C (W99) v QF D (W100).

**Third-place playoff (M103)** and **Final (M104)** follow standard format.

---

### 1.6 Annex C — the 495-row lookup table for the best 3rds

#### What it solves

After the group stage, you have 12 third-placed teams (one per group). Article 13 ranks them; the **top 8 advance**. Mathematically there are **C(12, 8) = 495** possible "which 8 groups produced an advancing 3rd-placed team" outcomes. Annex C is a 495-row lookup table — one row per outcome — that pre-assigns each surviving 3rd-placed team to one of the 8 group winners (1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L).

#### Why a table, not a formula

A simple "rank-N 3rd → match-N slot" mapping isn't feasible because:

1. Each winner can only face 3rd-placed teams from a specific **5-group subset** (Cat. 3 table above).
2. The subsets overlap, so the assignment is a constraint-satisfaction problem.
3. FIFA pre-solves all 495 cases for determinism and bracket balance.

This is the same mechanism UEFA uses for "best 3rd of 6" at the Euros, scaled from C(6, 4) = 15 to C(12, 8) = 495.

#### Table layout

Annex C columns: `1A | 1B | 1D | 1E | 1G | 1I | 1K | 1L` (the 8 winners that need a 3rd-place opponent).

Each row contains 8 cells like `3E`, `3J`, etc. — the 3rd-placed team assigned to each winner for that scenario. The row is implicitly keyed by the set of 8 surviving 3rds. (The four winners not listed — 1C, 1F, 1H, 1J — face runners-up per Category 2 and are fixed.)

**Example (Annex C, row 1):**

| Winner | Opponent | R32 match |
|---|---|---|
| 1A | 3E | M79 |
| 1B | 3J | M85 |
| 1D | 3I | M81 |
| 1E | 3F | M74 |
| 1G | 3H | M82 |
| 1I | 3G | M77 |
| 1K | 3L | M87 |
| 1L | 3K | M80 |

#### Resolution algorithm (for code)

```
Inputs:
  groupStandings: per group A–L → [1st, 2nd, 3rd, 4th]
  thirdPlaceRanking: the 12 third-placed teams ranked per Article 13

Steps:
  1. survivingThirds = top 8 of thirdPlaceRanking         # set of 8 groups
  2. eliminatedFour = the 4 groups not in survivingThirds # used as the lookup key
  3. row = lookupAnnexC(survivingThirds)                  # 1 of 495 pre-computed rows
  4. for each winnerSlot in [1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L]:
       opponent = row[winnerSlot]                         # e.g. "3E"
       schedule R32 match: groupStandings[winnerSlot] vs groupStandings[opponent]
  5. Category 1 + Category 2 matches are static — no lookup needed.
```

The full 495 rows live on pages 80–97 of the regulations PDF. They are reproduced verbatim in **§1.7 below** and are also available as a machine-readable artifact at [`WORLD_CUP_2026_ANNEX_C.json`](WORLD_CUP_2026_ANNEX_C.json) at the repo root. The JSON is indexed two ways:

- `by_option[N]` → `{surviving_thirds: [...], pairings: {1A: 3X, ...}}` — keyed by FIFA's row number (1–495).
- `by_surviving_thirds["ABCDEFGH"]` → option number — keyed by the sorted 8-letter set of surviving 3rd-placed groups (the natural lookup key in code).

The JSON includes a `validated` block recording the integrity checks performed at transcription time:
- All 495 rows parsed (no gaps).
- Each row uses exactly 8 distinct group letters.
- Each row obeys the Category 3 pools from §1.5 (no winner is paired with a 3rd-placed team from a group outside its allowed 5-group pool).
- All 495 surviving-thirds keys are distinct (covering all C(12, 8) combinations).
- Row 1 matches the example shown in this doc.

Re-run the validation any time the JSON is regenerated.

---

### 1.7 The full Annex C table (495 rows, FIFA-verified)

Transcribed from the FIFA World Cup 2026 Regulations PDF (Annexe C, pages 80–97) via `pypdf` and validated against the Category 3 pool constraints from §1.5. Machine-readable copy at [`WORLD_CUP_2026_ANNEX_C.json`](WORLD_CUP_2026_ANNEX_C.json).

The **#** column is FIFA's row number (1–495). **Surviving 3rds** is the sorted set of group letters whose 3rd-placed teams qualified to R32 — this is the lookup key when resolving the bracket at runtime. The eight winner columns (1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L) name the 3rd-placed team each winner faces in R32.

| # | Surviving 3rds | 1A | 1B | 1D | 1E | 1G | 1I | 1K | 1L |
|---|---|---|---|---|---|---|---|---|---|
| 1 | EFGHIJKL | 3E | 3J | 3I | 3F | 3H | 3G | 3L | 3K |
| 2 | DFGHIJKL | 3H | 3G | 3I | 3D | 3J | 3F | 3L | 3K |
| 3 | DEGHIJKL | 3E | 3J | 3I | 3D | 3H | 3G | 3L | 3K |
| 4 | DEFHIJKL | 3E | 3J | 3I | 3D | 3H | 3F | 3L | 3K |
| 5 | DEFGIJKL | 3E | 3G | 3I | 3D | 3J | 3F | 3L | 3K |
| 6 | DEFGHJKL | 3E | 3G | 3J | 3D | 3H | 3F | 3L | 3K |
| 7 | DEFGHIKL | 3E | 3G | 3I | 3D | 3H | 3F | 3L | 3K |
| 8 | DEFGHIJL | 3E | 3G | 3J | 3D | 3H | 3F | 3L | 3I |
| 9 | DEFGHIJK | 3E | 3G | 3J | 3D | 3H | 3F | 3I | 3K |
| 10 | CFGHIJKL | 3H | 3G | 3I | 3C | 3J | 3F | 3L | 3K |
| 11 | CEGHIJKL | 3E | 3J | 3I | 3C | 3H | 3G | 3L | 3K |
| 12 | CEFHIJKL | 3E | 3J | 3I | 3C | 3H | 3F | 3L | 3K |
| 13 | CEFGIJKL | 3E | 3G | 3I | 3C | 3J | 3F | 3L | 3K |
| 14 | CEFGHJKL | 3E | 3G | 3J | 3C | 3H | 3F | 3L | 3K |
| 15 | CEFGHIKL | 3E | 3G | 3I | 3C | 3H | 3F | 3L | 3K |
| 16 | CEFGHIJL | 3E | 3G | 3J | 3C | 3H | 3F | 3L | 3I |
| 17 | CEFGHIJK | 3E | 3G | 3J | 3C | 3H | 3F | 3I | 3K |
| 18 | CDGHIJKL | 3H | 3G | 3I | 3C | 3J | 3D | 3L | 3K |
| 19 | CDFHIJKL | 3C | 3J | 3I | 3D | 3H | 3F | 3L | 3K |
| 20 | CDFGIJKL | 3C | 3G | 3I | 3D | 3J | 3F | 3L | 3K |
| 21 | CDFGHJKL | 3C | 3G | 3J | 3D | 3H | 3F | 3L | 3K |
| 22 | CDFGHIKL | 3C | 3G | 3I | 3D | 3H | 3F | 3L | 3K |
| 23 | CDFGHIJL | 3C | 3G | 3J | 3D | 3H | 3F | 3L | 3I |
| 24 | CDFGHIJK | 3C | 3G | 3J | 3D | 3H | 3F | 3I | 3K |
| 25 | CDEHIJKL | 3E | 3J | 3I | 3C | 3H | 3D | 3L | 3K |
| 26 | CDEGIJKL | 3E | 3G | 3I | 3C | 3J | 3D | 3L | 3K |
| 27 | CDEGHJKL | 3E | 3G | 3J | 3C | 3H | 3D | 3L | 3K |
| 28 | CDEGHIKL | 3E | 3G | 3I | 3C | 3H | 3D | 3L | 3K |
| 29 | CDEGHIJL | 3E | 3G | 3J | 3C | 3H | 3D | 3L | 3I |
| 30 | CDEGHIJK | 3E | 3G | 3J | 3C | 3H | 3D | 3I | 3K |
| 31 | CDEFIJKL | 3C | 3J | 3E | 3D | 3I | 3F | 3L | 3K |
| 32 | CDEFHJKL | 3C | 3J | 3E | 3D | 3H | 3F | 3L | 3K |
| 33 | CDEFHIKL | 3C | 3E | 3I | 3D | 3H | 3F | 3L | 3K |
| 34 | CDEFHIJL | 3C | 3J | 3E | 3D | 3H | 3F | 3L | 3I |
| 35 | CDEFHIJK | 3C | 3J | 3E | 3D | 3H | 3F | 3I | 3K |
| 36 | CDEFGJKL | 3C | 3G | 3E | 3D | 3J | 3F | 3L | 3K |
| 37 | CDEFGIKL | 3C | 3G | 3E | 3D | 3I | 3F | 3L | 3K |
| 38 | CDEFGIJL | 3C | 3G | 3E | 3D | 3J | 3F | 3L | 3I |
| 39 | CDEFGIJK | 3C | 3G | 3E | 3D | 3J | 3F | 3I | 3K |
| 40 | CDEFGHKL | 3C | 3G | 3E | 3D | 3H | 3F | 3L | 3K |
| 41 | CDEFGHJL | 3C | 3G | 3J | 3D | 3H | 3F | 3L | 3E |
| 42 | CDEFGHJK | 3C | 3G | 3J | 3D | 3H | 3F | 3E | 3K |
| 43 | CDEFGHIL | 3C | 3G | 3E | 3D | 3H | 3F | 3L | 3I |
| 44 | CDEFGHIK | 3C | 3G | 3E | 3D | 3H | 3F | 3I | 3K |
| 45 | CDEFGHIJ | 3C | 3G | 3J | 3D | 3H | 3F | 3E | 3I |
| 46 | BFGHIJKL | 3H | 3J | 3B | 3F | 3I | 3G | 3L | 3K |
| 47 | BEGHIJKL | 3E | 3J | 3I | 3B | 3H | 3G | 3L | 3K |
| 48 | BEFHIJKL | 3E | 3J | 3B | 3F | 3I | 3H | 3L | 3K |
| 49 | BEFGIJKL | 3E | 3J | 3B | 3F | 3I | 3G | 3L | 3K |
| 50 | BEFGHJKL | 3E | 3J | 3B | 3F | 3H | 3G | 3L | 3K |
| 51 | BEFGHIKL | 3E | 3G | 3B | 3F | 3I | 3H | 3L | 3K |
| 52 | BEFGHIJL | 3E | 3J | 3B | 3F | 3H | 3G | 3L | 3I |
| 53 | BEFGHIJK | 3E | 3J | 3B | 3F | 3H | 3G | 3I | 3K |
| 54 | BDGHIJKL | 3H | 3J | 3B | 3D | 3I | 3G | 3L | 3K |
| 55 | BDFHIJKL | 3H | 3J | 3B | 3D | 3I | 3F | 3L | 3K |
| 56 | BDFGIJKL | 3I | 3G | 3B | 3D | 3J | 3F | 3L | 3K |
| 57 | BDFGHJKL | 3H | 3G | 3B | 3D | 3J | 3F | 3L | 3K |
| 58 | BDFGHIKL | 3H | 3G | 3B | 3D | 3I | 3F | 3L | 3K |
| 59 | BDFGHIJL | 3H | 3G | 3B | 3D | 3J | 3F | 3L | 3I |
| 60 | BDFGHIJK | 3H | 3G | 3B | 3D | 3J | 3F | 3I | 3K |
| 61 | BDEHIJKL | 3E | 3J | 3B | 3D | 3I | 3H | 3L | 3K |
| 62 | BDEGIJKL | 3E | 3J | 3B | 3D | 3I | 3G | 3L | 3K |
| 63 | BDEGHJKL | 3E | 3J | 3B | 3D | 3H | 3G | 3L | 3K |
| 64 | BDEGHIKL | 3E | 3G | 3B | 3D | 3I | 3H | 3L | 3K |
| 65 | BDEGHIJL | 3E | 3J | 3B | 3D | 3H | 3G | 3L | 3I |
| 66 | BDEGHIJK | 3E | 3J | 3B | 3D | 3H | 3G | 3I | 3K |
| 67 | BDEFIJKL | 3E | 3J | 3B | 3D | 3I | 3F | 3L | 3K |
| 68 | BDEFHJKL | 3E | 3J | 3B | 3D | 3H | 3F | 3L | 3K |
| 69 | BDEFHIKL | 3E | 3I | 3B | 3D | 3H | 3F | 3L | 3K |
| 70 | BDEFHIJL | 3E | 3J | 3B | 3D | 3H | 3F | 3L | 3I |
| 71 | BDEFHIJK | 3E | 3J | 3B | 3D | 3H | 3F | 3I | 3K |
| 72 | BDEFGJKL | 3E | 3G | 3B | 3D | 3J | 3F | 3L | 3K |
| 73 | BDEFGIKL | 3E | 3G | 3B | 3D | 3I | 3F | 3L | 3K |
| 74 | BDEFGIJL | 3E | 3G | 3B | 3D | 3J | 3F | 3L | 3I |
| 75 | BDEFGIJK | 3E | 3G | 3B | 3D | 3J | 3F | 3I | 3K |
| 76 | BDEFGHKL | 3E | 3G | 3B | 3D | 3H | 3F | 3L | 3K |
| 77 | BDEFGHJL | 3H | 3G | 3B | 3D | 3J | 3F | 3L | 3E |
| 78 | BDEFGHJK | 3H | 3G | 3B | 3D | 3J | 3F | 3E | 3K |
| 79 | BDEFGHIL | 3E | 3G | 3B | 3D | 3H | 3F | 3L | 3I |
| 80 | BDEFGHIK | 3E | 3G | 3B | 3D | 3H | 3F | 3I | 3K |
| 81 | BDEFGHIJ | 3H | 3G | 3B | 3D | 3J | 3F | 3E | 3I |
| 82 | BCGHIJKL | 3H | 3J | 3B | 3C | 3I | 3G | 3L | 3K |
| 83 | BCFHIJKL | 3H | 3J | 3B | 3C | 3I | 3F | 3L | 3K |
| 84 | BCFGIJKL | 3I | 3G | 3B | 3C | 3J | 3F | 3L | 3K |
| 85 | BCFGHJKL | 3H | 3G | 3B | 3C | 3J | 3F | 3L | 3K |
| 86 | BCFGHIKL | 3H | 3G | 3B | 3C | 3I | 3F | 3L | 3K |
| 87 | BCFGHIJL | 3H | 3G | 3B | 3C | 3J | 3F | 3L | 3I |
| 88 | BCFGHIJK | 3H | 3G | 3B | 3C | 3J | 3F | 3I | 3K |
| 89 | BCEHIJKL | 3E | 3J | 3B | 3C | 3I | 3H | 3L | 3K |
| 90 | BCEGIJKL | 3E | 3J | 3B | 3C | 3I | 3G | 3L | 3K |
| 91 | BCEGHJKL | 3E | 3J | 3B | 3C | 3H | 3G | 3L | 3K |
| 92 | BCEGHIKL | 3E | 3G | 3B | 3C | 3I | 3H | 3L | 3K |
| 93 | BCEGHIJL | 3E | 3J | 3B | 3C | 3H | 3G | 3L | 3I |
| 94 | BCEGHIJK | 3E | 3J | 3B | 3C | 3H | 3G | 3I | 3K |
| 95 | BCEFIJKL | 3E | 3J | 3B | 3C | 3I | 3F | 3L | 3K |
| 96 | BCEFHJKL | 3E | 3J | 3B | 3C | 3H | 3F | 3L | 3K |
| 97 | BCEFHIKL | 3E | 3I | 3B | 3C | 3H | 3F | 3L | 3K |
| 98 | BCEFHIJL | 3E | 3J | 3B | 3C | 3H | 3F | 3L | 3I |
| 99 | BCEFHIJK | 3E | 3J | 3B | 3C | 3H | 3F | 3I | 3K |
| 100 | BCEFGJKL | 3E | 3G | 3B | 3C | 3J | 3F | 3L | 3K |
| 101 | BCEFGIKL | 3E | 3G | 3B | 3C | 3I | 3F | 3L | 3K |
| 102 | BCEFGIJL | 3E | 3G | 3B | 3C | 3J | 3F | 3L | 3I |
| 103 | BCEFGIJK | 3E | 3G | 3B | 3C | 3J | 3F | 3I | 3K |
| 104 | BCEFGHKL | 3E | 3G | 3B | 3C | 3H | 3F | 3L | 3K |
| 105 | BCEFGHJL | 3H | 3G | 3B | 3C | 3J | 3F | 3L | 3E |
| 106 | BCEFGHJK | 3H | 3G | 3B | 3C | 3J | 3F | 3E | 3K |
| 107 | BCEFGHIL | 3E | 3G | 3B | 3C | 3H | 3F | 3L | 3I |
| 108 | BCEFGHIK | 3E | 3G | 3B | 3C | 3H | 3F | 3I | 3K |
| 109 | BCEFGHIJ | 3H | 3G | 3B | 3C | 3J | 3F | 3E | 3I |
| 110 | BCDHIJKL | 3H | 3J | 3B | 3C | 3I | 3D | 3L | 3K |
| 111 | BCDGIJKL | 3I | 3G | 3B | 3C | 3J | 3D | 3L | 3K |
| 112 | BCDGHJKL | 3H | 3G | 3B | 3C | 3J | 3D | 3L | 3K |
| 113 | BCDGHIKL | 3H | 3G | 3B | 3C | 3I | 3D | 3L | 3K |
| 114 | BCDGHIJL | 3H | 3G | 3B | 3C | 3J | 3D | 3L | 3I |
| 115 | BCDGHIJK | 3H | 3G | 3B | 3C | 3J | 3D | 3I | 3K |
| 116 | BCDFIJKL | 3C | 3J | 3B | 3D | 3I | 3F | 3L | 3K |
| 117 | BCDFHJKL | 3C | 3J | 3B | 3D | 3H | 3F | 3L | 3K |
| 118 | BCDFHIKL | 3C | 3I | 3B | 3D | 3H | 3F | 3L | 3K |
| 119 | BCDFHIJL | 3C | 3J | 3B | 3D | 3H | 3F | 3L | 3I |
| 120 | BCDFHIJK | 3C | 3J | 3B | 3D | 3H | 3F | 3I | 3K |
| 121 | BCDFGJKL | 3C | 3G | 3B | 3D | 3J | 3F | 3L | 3K |
| 122 | BCDFGIKL | 3C | 3G | 3B | 3D | 3I | 3F | 3L | 3K |
| 123 | BCDFGIJL | 3C | 3G | 3B | 3D | 3J | 3F | 3L | 3I |
| 124 | BCDFGIJK | 3C | 3G | 3B | 3D | 3J | 3F | 3I | 3K |
| 125 | BCDFGHKL | 3C | 3G | 3B | 3D | 3H | 3F | 3L | 3K |
| 126 | BCDFGHJL | 3C | 3G | 3B | 3D | 3H | 3F | 3L | 3J |
| 127 | BCDFGHJK | 3H | 3G | 3B | 3C | 3J | 3F | 3D | 3K |
| 128 | BCDFGHIL | 3C | 3G | 3B | 3D | 3H | 3F | 3L | 3I |
| 129 | BCDFGHIK | 3C | 3G | 3B | 3D | 3H | 3F | 3I | 3K |
| 130 | BCDFGHIJ | 3H | 3G | 3B | 3C | 3J | 3F | 3D | 3I |
| 131 | BCDEIJKL | 3E | 3J | 3B | 3C | 3I | 3D | 3L | 3K |
| 132 | BCDEHJKL | 3E | 3J | 3B | 3C | 3H | 3D | 3L | 3K |
| 133 | BCDEHIKL | 3E | 3I | 3B | 3C | 3H | 3D | 3L | 3K |
| 134 | BCDEHIJL | 3E | 3J | 3B | 3C | 3H | 3D | 3L | 3I |
| 135 | BCDEHIJK | 3E | 3J | 3B | 3C | 3H | 3D | 3I | 3K |
| 136 | BCDEGJKL | 3E | 3G | 3B | 3C | 3J | 3D | 3L | 3K |
| 137 | BCDEGIKL | 3E | 3G | 3B | 3C | 3I | 3D | 3L | 3K |
| 138 | BCDEGIJL | 3E | 3G | 3B | 3C | 3J | 3D | 3L | 3I |
| 139 | BCDEGIJK | 3E | 3G | 3B | 3C | 3J | 3D | 3I | 3K |
| 140 | BCDEGHKL | 3E | 3G | 3B | 3C | 3H | 3D | 3L | 3K |
| 141 | BCDEGHJL | 3H | 3G | 3B | 3C | 3J | 3D | 3L | 3E |
| 142 | BCDEGHJK | 3H | 3G | 3B | 3C | 3J | 3D | 3E | 3K |
| 143 | BCDEGHIL | 3E | 3G | 3B | 3C | 3H | 3D | 3L | 3I |
| 144 | BCDEGHIK | 3E | 3G | 3B | 3C | 3H | 3D | 3I | 3K |
| 145 | BCDEGHIJ | 3H | 3G | 3B | 3C | 3J | 3D | 3E | 3I |
| 146 | BCDEFJKL | 3C | 3J | 3B | 3D | 3E | 3F | 3L | 3K |
| 147 | BCDEFIKL | 3C | 3E | 3B | 3D | 3I | 3F | 3L | 3K |
| 148 | BCDEFIJL | 3C | 3J | 3B | 3D | 3E | 3F | 3L | 3I |
| 149 | BCDEFIJK | 3C | 3J | 3B | 3D | 3E | 3F | 3I | 3K |
| 150 | BCDEFHKL | 3C | 3E | 3B | 3D | 3H | 3F | 3L | 3K |
| 151 | BCDEFHJL | 3C | 3J | 3B | 3D | 3H | 3F | 3L | 3E |
| 152 | BCDEFHJK | 3C | 3J | 3B | 3D | 3H | 3F | 3E | 3K |
| 153 | BCDEFHIL | 3C | 3E | 3B | 3D | 3H | 3F | 3L | 3I |
| 154 | BCDEFHIK | 3C | 3E | 3B | 3D | 3H | 3F | 3I | 3K |
| 155 | BCDEFHIJ | 3C | 3J | 3B | 3D | 3H | 3F | 3E | 3I |
| 156 | BCDEFGKL | 3C | 3G | 3B | 3D | 3E | 3F | 3L | 3K |
| 157 | BCDEFGJL | 3C | 3G | 3B | 3D | 3J | 3F | 3L | 3E |
| 158 | BCDEFGJK | 3C | 3G | 3B | 3D | 3J | 3F | 3E | 3K |
| 159 | BCDEFGIL | 3C | 3G | 3B | 3D | 3E | 3F | 3L | 3I |
| 160 | BCDEFGIK | 3C | 3G | 3B | 3D | 3E | 3F | 3I | 3K |
| 161 | BCDEFGIJ | 3C | 3G | 3B | 3D | 3J | 3F | 3E | 3I |
| 162 | BCDEFGHL | 3C | 3G | 3B | 3D | 3H | 3F | 3L | 3E |
| 163 | BCDEFGHK | 3C | 3G | 3B | 3D | 3H | 3F | 3E | 3K |
| 164 | BCDEFGHJ | 3H | 3G | 3B | 3C | 3J | 3F | 3D | 3E |
| 165 | BCDEFGHI | 3C | 3G | 3B | 3D | 3H | 3F | 3E | 3I |
| 166 | AFGHIJKL | 3H | 3J | 3I | 3F | 3A | 3G | 3L | 3K |
| 167 | AEGHIJKL | 3E | 3J | 3I | 3A | 3H | 3G | 3L | 3K |
| 168 | AEFHIJKL | 3E | 3J | 3I | 3F | 3A | 3H | 3L | 3K |
| 169 | AEFGIJKL | 3E | 3J | 3I | 3F | 3A | 3G | 3L | 3K |
| 170 | AEFGHJKL | 3E | 3G | 3J | 3F | 3A | 3H | 3L | 3K |
| 171 | AEFGHIKL | 3E | 3G | 3I | 3F | 3A | 3H | 3L | 3K |
| 172 | AEFGHIJL | 3E | 3G | 3J | 3F | 3A | 3H | 3L | 3I |
| 173 | AEFGHIJK | 3E | 3G | 3J | 3F | 3A | 3H | 3I | 3K |
| 174 | ADGHIJKL | 3H | 3J | 3I | 3D | 3A | 3G | 3L | 3K |
| 175 | ADFHIJKL | 3H | 3J | 3I | 3D | 3A | 3F | 3L | 3K |
| 176 | ADFGIJKL | 3I | 3G | 3J | 3D | 3A | 3F | 3L | 3K |
| 177 | ADFGHJKL | 3H | 3G | 3J | 3D | 3A | 3F | 3L | 3K |
| 178 | ADFGHIKL | 3H | 3G | 3I | 3D | 3A | 3F | 3L | 3K |
| 179 | ADFGHIJL | 3H | 3G | 3J | 3D | 3A | 3F | 3L | 3I |
| 180 | ADFGHIJK | 3H | 3G | 3J | 3D | 3A | 3F | 3I | 3K |
| 181 | ADEHIJKL | 3E | 3J | 3I | 3D | 3A | 3H | 3L | 3K |
| 182 | ADEGIJKL | 3E | 3J | 3I | 3D | 3A | 3G | 3L | 3K |
| 183 | ADEGHJKL | 3E | 3G | 3J | 3D | 3A | 3H | 3L | 3K |
| 184 | ADEGHIKL | 3E | 3G | 3I | 3D | 3A | 3H | 3L | 3K |
| 185 | ADEGHIJL | 3E | 3G | 3J | 3D | 3A | 3H | 3L | 3I |
| 186 | ADEGHIJK | 3E | 3G | 3J | 3D | 3A | 3H | 3I | 3K |
| 187 | ADEFIJKL | 3E | 3J | 3I | 3D | 3A | 3F | 3L | 3K |
| 188 | ADEFHJKL | 3H | 3J | 3E | 3D | 3A | 3F | 3L | 3K |
| 189 | ADEFHIKL | 3H | 3E | 3I | 3D | 3A | 3F | 3L | 3K |
| 190 | ADEFHIJL | 3H | 3J | 3E | 3D | 3A | 3F | 3L | 3I |
| 191 | ADEFHIJK | 3H | 3J | 3E | 3D | 3A | 3F | 3I | 3K |
| 192 | ADEFGJKL | 3E | 3G | 3J | 3D | 3A | 3F | 3L | 3K |
| 193 | ADEFGIKL | 3E | 3G | 3I | 3D | 3A | 3F | 3L | 3K |
| 194 | ADEFGIJL | 3E | 3G | 3J | 3D | 3A | 3F | 3L | 3I |
| 195 | ADEFGIJK | 3E | 3G | 3J | 3D | 3A | 3F | 3I | 3K |
| 196 | ADEFGHKL | 3H | 3G | 3E | 3D | 3A | 3F | 3L | 3K |
| 197 | ADEFGHJL | 3H | 3G | 3J | 3D | 3A | 3F | 3L | 3E |
| 198 | ADEFGHJK | 3H | 3G | 3J | 3D | 3A | 3F | 3E | 3K |
| 199 | ADEFGHIL | 3H | 3G | 3E | 3D | 3A | 3F | 3L | 3I |
| 200 | ADEFGHIK | 3H | 3G | 3E | 3D | 3A | 3F | 3I | 3K |
| 201 | ADEFGHIJ | 3H | 3G | 3J | 3D | 3A | 3F | 3E | 3I |
| 202 | ACGHIJKL | 3H | 3J | 3I | 3C | 3A | 3G | 3L | 3K |
| 203 | ACFHIJKL | 3H | 3J | 3I | 3C | 3A | 3F | 3L | 3K |
| 204 | ACFGIJKL | 3I | 3G | 3J | 3C | 3A | 3F | 3L | 3K |
| 205 | ACFGHJKL | 3H | 3G | 3J | 3C | 3A | 3F | 3L | 3K |
| 206 | ACFGHIKL | 3H | 3G | 3I | 3C | 3A | 3F | 3L | 3K |
| 207 | ACFGHIJL | 3H | 3G | 3J | 3C | 3A | 3F | 3L | 3I |
| 208 | ACFGHIJK | 3H | 3G | 3J | 3C | 3A | 3F | 3I | 3K |
| 209 | ACEHIJKL | 3E | 3J | 3I | 3C | 3A | 3H | 3L | 3K |
| 210 | ACEGIJKL | 3E | 3J | 3I | 3C | 3A | 3G | 3L | 3K |
| 211 | ACEGHJKL | 3E | 3G | 3J | 3C | 3A | 3H | 3L | 3K |
| 212 | ACEGHIKL | 3E | 3G | 3I | 3C | 3A | 3H | 3L | 3K |
| 213 | ACEGHIJL | 3E | 3G | 3J | 3C | 3A | 3H | 3L | 3I |
| 214 | ACEGHIJK | 3E | 3G | 3J | 3C | 3A | 3H | 3I | 3K |
| 215 | ACEFIJKL | 3E | 3J | 3I | 3C | 3A | 3F | 3L | 3K |
| 216 | ACEFHJKL | 3H | 3J | 3E | 3C | 3A | 3F | 3L | 3K |
| 217 | ACEFHIKL | 3H | 3E | 3I | 3C | 3A | 3F | 3L | 3K |
| 218 | ACEFHIJL | 3H | 3J | 3E | 3C | 3A | 3F | 3L | 3I |
| 219 | ACEFHIJK | 3H | 3J | 3E | 3C | 3A | 3F | 3I | 3K |
| 220 | ACEFGJKL | 3E | 3G | 3J | 3C | 3A | 3F | 3L | 3K |
| 221 | ACEFGIKL | 3E | 3G | 3I | 3C | 3A | 3F | 3L | 3K |
| 222 | ACEFGIJL | 3E | 3G | 3J | 3C | 3A | 3F | 3L | 3I |
| 223 | ACEFGIJK | 3E | 3G | 3J | 3C | 3A | 3F | 3I | 3K |
| 224 | ACEFGHKL | 3H | 3G | 3E | 3C | 3A | 3F | 3L | 3K |
| 225 | ACEFGHJL | 3H | 3G | 3J | 3C | 3A | 3F | 3L | 3E |
| 226 | ACEFGHJK | 3H | 3G | 3J | 3C | 3A | 3F | 3E | 3K |
| 227 | ACEFGHIL | 3H | 3G | 3E | 3C | 3A | 3F | 3L | 3I |
| 228 | ACEFGHIK | 3H | 3G | 3E | 3C | 3A | 3F | 3I | 3K |
| 229 | ACEFGHIJ | 3H | 3G | 3J | 3C | 3A | 3F | 3E | 3I |
| 230 | ACDHIJKL | 3H | 3J | 3I | 3C | 3A | 3D | 3L | 3K |
| 231 | ACDGIJKL | 3I | 3G | 3J | 3C | 3A | 3D | 3L | 3K |
| 232 | ACDGHJKL | 3H | 3G | 3J | 3C | 3A | 3D | 3L | 3K |
| 233 | ACDGHIKL | 3H | 3G | 3I | 3C | 3A | 3D | 3L | 3K |
| 234 | ACDGHIJL | 3H | 3G | 3J | 3C | 3A | 3D | 3L | 3I |
| 235 | ACDGHIJK | 3H | 3G | 3J | 3C | 3A | 3D | 3I | 3K |
| 236 | ACDFIJKL | 3C | 3J | 3I | 3D | 3A | 3F | 3L | 3K |
| 237 | ACDFHJKL | 3H | 3J | 3F | 3C | 3A | 3D | 3L | 3K |
| 238 | ACDFHIKL | 3H | 3F | 3I | 3C | 3A | 3D | 3L | 3K |
| 239 | ACDFHIJL | 3H | 3J | 3F | 3C | 3A | 3D | 3L | 3I |
| 240 | ACDFHIJK | 3H | 3J | 3F | 3C | 3A | 3D | 3I | 3K |
| 241 | ACDFGJKL | 3C | 3G | 3J | 3D | 3A | 3F | 3L | 3K |
| 242 | ACDFGIKL | 3C | 3G | 3I | 3D | 3A | 3F | 3L | 3K |
| 243 | ACDFGIJL | 3C | 3G | 3J | 3D | 3A | 3F | 3L | 3I |
| 244 | ACDFGIJK | 3C | 3G | 3J | 3D | 3A | 3F | 3I | 3K |
| 245 | ACDFGHKL | 3H | 3G | 3F | 3C | 3A | 3D | 3L | 3K |
| 246 | ACDFGHJL | 3C | 3G | 3J | 3D | 3A | 3F | 3L | 3H |
| 247 | ACDFGHJK | 3H | 3G | 3J | 3C | 3A | 3F | 3D | 3K |
| 248 | ACDFGHIL | 3H | 3G | 3F | 3C | 3A | 3D | 3L | 3I |
| 249 | ACDFGHIK | 3H | 3G | 3F | 3C | 3A | 3D | 3I | 3K |
| 250 | ACDFGHIJ | 3H | 3G | 3J | 3C | 3A | 3F | 3D | 3I |
| 251 | ACDEIJKL | 3E | 3J | 3I | 3C | 3A | 3D | 3L | 3K |
| 252 | ACDEHJKL | 3H | 3J | 3E | 3C | 3A | 3D | 3L | 3K |
| 253 | ACDEHIKL | 3H | 3E | 3I | 3C | 3A | 3D | 3L | 3K |
| 254 | ACDEHIJL | 3H | 3J | 3E | 3C | 3A | 3D | 3L | 3I |
| 255 | ACDEHIJK | 3H | 3J | 3E | 3C | 3A | 3D | 3I | 3K |
| 256 | ACDEGJKL | 3E | 3G | 3J | 3C | 3A | 3D | 3L | 3K |
| 257 | ACDEGIKL | 3E | 3G | 3I | 3C | 3A | 3D | 3L | 3K |
| 258 | ACDEGIJL | 3E | 3G | 3J | 3C | 3A | 3D | 3L | 3I |
| 259 | ACDEGIJK | 3E | 3G | 3J | 3C | 3A | 3D | 3I | 3K |
| 260 | ACDEGHKL | 3H | 3G | 3E | 3C | 3A | 3D | 3L | 3K |
| 261 | ACDEGHJL | 3H | 3G | 3J | 3C | 3A | 3D | 3L | 3E |
| 262 | ACDEGHJK | 3H | 3G | 3J | 3C | 3A | 3D | 3E | 3K |
| 263 | ACDEGHIL | 3H | 3G | 3E | 3C | 3A | 3D | 3L | 3I |
| 264 | ACDEGHIK | 3H | 3G | 3E | 3C | 3A | 3D | 3I | 3K |
| 265 | ACDEGHIJ | 3H | 3G | 3J | 3C | 3A | 3D | 3E | 3I |
| 266 | ACDEFJKL | 3C | 3J | 3E | 3D | 3A | 3F | 3L | 3K |
| 267 | ACDEFIKL | 3C | 3E | 3I | 3D | 3A | 3F | 3L | 3K |
| 268 | ACDEFIJL | 3C | 3J | 3E | 3D | 3A | 3F | 3L | 3I |
| 269 | ACDEFIJK | 3C | 3J | 3E | 3D | 3A | 3F | 3I | 3K |
| 270 | ACDEFHKL | 3H | 3E | 3F | 3C | 3A | 3D | 3L | 3K |
| 271 | ACDEFHJL | 3H | 3J | 3F | 3C | 3A | 3D | 3L | 3E |
| 272 | ACDEFHJK | 3H | 3J | 3E | 3C | 3A | 3F | 3D | 3K |
| 273 | ACDEFHIL | 3H | 3E | 3F | 3C | 3A | 3D | 3L | 3I |
| 274 | ACDEFHIK | 3H | 3E | 3F | 3C | 3A | 3D | 3I | 3K |
| 275 | ACDEFHIJ | 3H | 3J | 3E | 3C | 3A | 3F | 3D | 3I |
| 276 | ACDEFGKL | 3C | 3G | 3E | 3D | 3A | 3F | 3L | 3K |
| 277 | ACDEFGJL | 3C | 3G | 3J | 3D | 3A | 3F | 3L | 3E |
| 278 | ACDEFGJK | 3C | 3G | 3J | 3D | 3A | 3F | 3E | 3K |
| 279 | ACDEFGIL | 3C | 3G | 3E | 3D | 3A | 3F | 3L | 3I |
| 280 | ACDEFGIK | 3C | 3G | 3E | 3D | 3A | 3F | 3I | 3K |
| 281 | ACDEFGIJ | 3C | 3G | 3J | 3D | 3A | 3F | 3E | 3I |
| 282 | ACDEFGHL | 3H | 3G | 3F | 3C | 3A | 3D | 3L | 3E |
| 283 | ACDEFGHK | 3H | 3G | 3E | 3C | 3A | 3F | 3D | 3K |
| 284 | ACDEFGHJ | 3H | 3G | 3J | 3C | 3A | 3F | 3D | 3E |
| 285 | ACDEFGHI | 3H | 3G | 3E | 3C | 3A | 3F | 3D | 3I |
| 286 | ABGHIJKL | 3H | 3J | 3B | 3A | 3I | 3G | 3L | 3K |
| 287 | ABFHIJKL | 3H | 3J | 3B | 3A | 3I | 3F | 3L | 3K |
| 288 | ABFGIJKL | 3I | 3J | 3B | 3F | 3A | 3G | 3L | 3K |
| 289 | ABFGHJKL | 3H | 3J | 3B | 3F | 3A | 3G | 3L | 3K |
| 290 | ABFGHIKL | 3H | 3G | 3B | 3A | 3I | 3F | 3L | 3K |
| 291 | ABFGHIJL | 3H | 3J | 3B | 3F | 3A | 3G | 3L | 3I |
| 292 | ABFGHIJK | 3H | 3J | 3B | 3F | 3A | 3G | 3I | 3K |
| 293 | ABEHIJKL | 3E | 3J | 3B | 3A | 3I | 3H | 3L | 3K |
| 294 | ABEGIJKL | 3E | 3J | 3B | 3A | 3I | 3G | 3L | 3K |
| 295 | ABEGHJKL | 3E | 3J | 3B | 3A | 3H | 3G | 3L | 3K |
| 296 | ABEGHIKL | 3E | 3G | 3B | 3A | 3I | 3H | 3L | 3K |
| 297 | ABEGHIJL | 3E | 3J | 3B | 3A | 3H | 3G | 3L | 3I |
| 298 | ABEGHIJK | 3E | 3J | 3B | 3A | 3H | 3G | 3I | 3K |
| 299 | ABEFIJKL | 3E | 3J | 3B | 3A | 3I | 3F | 3L | 3K |
| 300 | ABEFHJKL | 3E | 3J | 3B | 3F | 3A | 3H | 3L | 3K |
| 301 | ABEFHIKL | 3E | 3I | 3B | 3F | 3A | 3H | 3L | 3K |
| 302 | ABEFHIJL | 3E | 3J | 3B | 3F | 3A | 3H | 3L | 3I |
| 303 | ABEFHIJK | 3E | 3J | 3B | 3F | 3A | 3H | 3I | 3K |
| 304 | ABEFGJKL | 3E | 3J | 3B | 3F | 3A | 3G | 3L | 3K |
| 305 | ABEFGIKL | 3E | 3G | 3B | 3A | 3I | 3F | 3L | 3K |
| 306 | ABEFGIJL | 3E | 3J | 3B | 3F | 3A | 3G | 3L | 3I |
| 307 | ABEFGIJK | 3E | 3J | 3B | 3F | 3A | 3G | 3I | 3K |
| 308 | ABEFGHKL | 3E | 3G | 3B | 3F | 3A | 3H | 3L | 3K |
| 309 | ABEFGHJL | 3H | 3J | 3B | 3F | 3A | 3G | 3L | 3E |
| 310 | ABEFGHJK | 3H | 3J | 3B | 3F | 3A | 3G | 3E | 3K |
| 311 | ABEFGHIL | 3E | 3G | 3B | 3F | 3A | 3H | 3L | 3I |
| 312 | ABEFGHIK | 3E | 3G | 3B | 3F | 3A | 3H | 3I | 3K |
| 313 | ABEFGHIJ | 3H | 3J | 3B | 3F | 3A | 3G | 3E | 3I |
| 314 | ABDHIJKL | 3I | 3J | 3B | 3D | 3A | 3H | 3L | 3K |
| 315 | ABDGIJKL | 3I | 3J | 3B | 3D | 3A | 3G | 3L | 3K |
| 316 | ABDGHJKL | 3H | 3J | 3B | 3D | 3A | 3G | 3L | 3K |
| 317 | ABDGHIKL | 3I | 3G | 3B | 3D | 3A | 3H | 3L | 3K |
| 318 | ABDGHIJL | 3H | 3J | 3B | 3D | 3A | 3G | 3L | 3I |
| 319 | ABDGHIJK | 3H | 3J | 3B | 3D | 3A | 3G | 3I | 3K |
| 320 | ABDFIJKL | 3I | 3J | 3B | 3D | 3A | 3F | 3L | 3K |
| 321 | ABDFHJKL | 3H | 3J | 3B | 3D | 3A | 3F | 3L | 3K |
| 322 | ABDFHIKL | 3H | 3I | 3B | 3D | 3A | 3F | 3L | 3K |
| 323 | ABDFHIJL | 3H | 3J | 3B | 3D | 3A | 3F | 3L | 3I |
| 324 | ABDFHIJK | 3H | 3J | 3B | 3D | 3A | 3F | 3I | 3K |
| 325 | ABDFGJKL | 3F | 3J | 3B | 3D | 3A | 3G | 3L | 3K |
| 326 | ABDFGIKL | 3I | 3G | 3B | 3D | 3A | 3F | 3L | 3K |
| 327 | ABDFGIJL | 3F | 3J | 3B | 3D | 3A | 3G | 3L | 3I |
| 328 | ABDFGIJK | 3F | 3J | 3B | 3D | 3A | 3G | 3I | 3K |
| 329 | ABDFGHKL | 3H | 3G | 3B | 3D | 3A | 3F | 3L | 3K |
| 330 | ABDFGHJL | 3H | 3G | 3B | 3D | 3A | 3F | 3L | 3J |
| 331 | ABDFGHJK | 3H | 3G | 3B | 3D | 3A | 3F | 3J | 3K |
| 332 | ABDFGHIL | 3H | 3G | 3B | 3D | 3A | 3F | 3L | 3I |
| 333 | ABDFGHIK | 3H | 3G | 3B | 3D | 3A | 3F | 3I | 3K |
| 334 | ABDFGHIJ | 3H | 3G | 3B | 3D | 3A | 3F | 3I | 3J |
| 335 | ABDEIJKL | 3E | 3J | 3B | 3A | 3I | 3D | 3L | 3K |
| 336 | ABDEHJKL | 3E | 3J | 3B | 3D | 3A | 3H | 3L | 3K |
| 337 | ABDEHIKL | 3E | 3I | 3B | 3D | 3A | 3H | 3L | 3K |
| 338 | ABDEHIJL | 3E | 3J | 3B | 3D | 3A | 3H | 3L | 3I |
| 339 | ABDEHIJK | 3E | 3J | 3B | 3D | 3A | 3H | 3I | 3K |
| 340 | ABDEGJKL | 3E | 3J | 3B | 3D | 3A | 3G | 3L | 3K |
| 341 | ABDEGIKL | 3E | 3G | 3B | 3A | 3I | 3D | 3L | 3K |
| 342 | ABDEGIJL | 3E | 3J | 3B | 3D | 3A | 3G | 3L | 3I |
| 343 | ABDEGIJK | 3E | 3J | 3B | 3D | 3A | 3G | 3I | 3K |
| 344 | ABDEGHKL | 3E | 3G | 3B | 3D | 3A | 3H | 3L | 3K |
| 345 | ABDEGHJL | 3H | 3J | 3B | 3D | 3A | 3G | 3L | 3E |
| 346 | ABDEGHJK | 3H | 3J | 3B | 3D | 3A | 3G | 3E | 3K |
| 347 | ABDEGHIL | 3E | 3G | 3B | 3D | 3A | 3H | 3L | 3I |
| 348 | ABDEGHIK | 3E | 3G | 3B | 3D | 3A | 3H | 3I | 3K |
| 349 | ABDEGHIJ | 3H | 3J | 3B | 3D | 3A | 3G | 3E | 3I |
| 350 | ABDEFJKL | 3E | 3J | 3B | 3D | 3A | 3F | 3L | 3K |
| 351 | ABDEFIKL | 3E | 3I | 3B | 3D | 3A | 3F | 3L | 3K |
| 352 | ABDEFIJL | 3E | 3J | 3B | 3D | 3A | 3F | 3L | 3I |
| 353 | ABDEFIJK | 3E | 3J | 3B | 3D | 3A | 3F | 3I | 3K |
| 354 | ABDEFHKL | 3H | 3E | 3B | 3D | 3A | 3F | 3L | 3K |
| 355 | ABDEFHJL | 3H | 3J | 3B | 3D | 3A | 3F | 3L | 3E |
| 356 | ABDEFHJK | 3H | 3J | 3B | 3D | 3A | 3F | 3E | 3K |
| 357 | ABDEFHIL | 3H | 3E | 3B | 3D | 3A | 3F | 3L | 3I |
| 358 | ABDEFHIK | 3H | 3E | 3B | 3D | 3A | 3F | 3I | 3K |
| 359 | ABDEFHIJ | 3H | 3J | 3B | 3D | 3A | 3F | 3E | 3I |
| 360 | ABDEFGKL | 3E | 3G | 3B | 3D | 3A | 3F | 3L | 3K |
| 361 | ABDEFGJL | 3E | 3G | 3B | 3D | 3A | 3F | 3L | 3J |
| 362 | ABDEFGJK | 3E | 3G | 3B | 3D | 3A | 3F | 3J | 3K |
| 363 | ABDEFGIL | 3E | 3G | 3B | 3D | 3A | 3F | 3L | 3I |
| 364 | ABDEFGIK | 3E | 3G | 3B | 3D | 3A | 3F | 3I | 3K |
| 365 | ABDEFGIJ | 3E | 3G | 3B | 3D | 3A | 3F | 3I | 3J |
| 366 | ABDEFGHL | 3H | 3G | 3B | 3D | 3A | 3F | 3L | 3E |
| 367 | ABDEFGHK | 3H | 3G | 3B | 3D | 3A | 3F | 3E | 3K |
| 368 | ABDEFGHJ | 3H | 3G | 3B | 3D | 3A | 3F | 3E | 3J |
| 369 | ABDEFGHI | 3H | 3G | 3B | 3D | 3A | 3F | 3E | 3I |
| 370 | ABCHIJKL | 3I | 3J | 3B | 3C | 3A | 3H | 3L | 3K |
| 371 | ABCGIJKL | 3I | 3J | 3B | 3C | 3A | 3G | 3L | 3K |
| 372 | ABCGHJKL | 3H | 3J | 3B | 3C | 3A | 3G | 3L | 3K |
| 373 | ABCGHIKL | 3I | 3G | 3B | 3C | 3A | 3H | 3L | 3K |
| 374 | ABCGHIJL | 3H | 3J | 3B | 3C | 3A | 3G | 3L | 3I |
| 375 | ABCGHIJK | 3H | 3J | 3B | 3C | 3A | 3G | 3I | 3K |
| 376 | ABCFIJKL | 3I | 3J | 3B | 3C | 3A | 3F | 3L | 3K |
| 377 | ABCFHJKL | 3H | 3J | 3B | 3C | 3A | 3F | 3L | 3K |
| 378 | ABCFHIKL | 3H | 3I | 3B | 3C | 3A | 3F | 3L | 3K |
| 379 | ABCFHIJL | 3H | 3J | 3B | 3C | 3A | 3F | 3L | 3I |
| 380 | ABCFHIJK | 3H | 3J | 3B | 3C | 3A | 3F | 3I | 3K |
| 381 | ABCFGJKL | 3C | 3J | 3B | 3F | 3A | 3G | 3L | 3K |
| 382 | ABCFGIKL | 3I | 3G | 3B | 3C | 3A | 3F | 3L | 3K |
| 383 | ABCFGIJL | 3C | 3J | 3B | 3F | 3A | 3G | 3L | 3I |
| 384 | ABCFGIJK | 3C | 3J | 3B | 3F | 3A | 3G | 3I | 3K |
| 385 | ABCFGHKL | 3H | 3G | 3B | 3C | 3A | 3F | 3L | 3K |
| 386 | ABCFGHJL | 3H | 3G | 3B | 3C | 3A | 3F | 3L | 3J |
| 387 | ABCFGHJK | 3H | 3G | 3B | 3C | 3A | 3F | 3J | 3K |
| 388 | ABCFGHIL | 3H | 3G | 3B | 3C | 3A | 3F | 3L | 3I |
| 389 | ABCFGHIK | 3H | 3G | 3B | 3C | 3A | 3F | 3I | 3K |
| 390 | ABCFGHIJ | 3H | 3G | 3B | 3C | 3A | 3F | 3I | 3J |
| 391 | ABCEIJKL | 3E | 3J | 3B | 3A | 3I | 3C | 3L | 3K |
| 392 | ABCEHJKL | 3E | 3J | 3B | 3C | 3A | 3H | 3L | 3K |
| 393 | ABCEHIKL | 3E | 3I | 3B | 3C | 3A | 3H | 3L | 3K |
| 394 | ABCEHIJL | 3E | 3J | 3B | 3C | 3A | 3H | 3L | 3I |
| 395 | ABCEHIJK | 3E | 3J | 3B | 3C | 3A | 3H | 3I | 3K |
| 396 | ABCEGJKL | 3E | 3J | 3B | 3C | 3A | 3G | 3L | 3K |
| 397 | ABCEGIKL | 3E | 3G | 3B | 3A | 3I | 3C | 3L | 3K |
| 398 | ABCEGIJL | 3E | 3J | 3B | 3C | 3A | 3G | 3L | 3I |
| 399 | ABCEGIJK | 3E | 3J | 3B | 3C | 3A | 3G | 3I | 3K |
| 400 | ABCEGHKL | 3E | 3G | 3B | 3C | 3A | 3H | 3L | 3K |
| 401 | ABCEGHJL | 3H | 3J | 3B | 3C | 3A | 3G | 3L | 3E |
| 402 | ABCEGHJK | 3H | 3J | 3B | 3C | 3A | 3G | 3E | 3K |
| 403 | ABCEGHIL | 3E | 3G | 3B | 3C | 3A | 3H | 3L | 3I |
| 404 | ABCEGHIK | 3E | 3G | 3B | 3C | 3A | 3H | 3I | 3K |
| 405 | ABCEGHIJ | 3H | 3J | 3B | 3C | 3A | 3G | 3E | 3I |
| 406 | ABCEFJKL | 3E | 3J | 3B | 3C | 3A | 3F | 3L | 3K |
| 407 | ABCEFIKL | 3E | 3I | 3B | 3C | 3A | 3F | 3L | 3K |
| 408 | ABCEFIJL | 3E | 3J | 3B | 3C | 3A | 3F | 3L | 3I |
| 409 | ABCEFIJK | 3E | 3J | 3B | 3C | 3A | 3F | 3I | 3K |
| 410 | ABCEFHKL | 3H | 3E | 3B | 3C | 3A | 3F | 3L | 3K |
| 411 | ABCEFHJL | 3H | 3J | 3B | 3C | 3A | 3F | 3L | 3E |
| 412 | ABCEFHJK | 3H | 3J | 3B | 3C | 3A | 3F | 3E | 3K |
| 413 | ABCEFHIL | 3H | 3E | 3B | 3C | 3A | 3F | 3L | 3I |
| 414 | ABCEFHIK | 3H | 3E | 3B | 3C | 3A | 3F | 3I | 3K |
| 415 | ABCEFHIJ | 3H | 3J | 3B | 3C | 3A | 3F | 3E | 3I |
| 416 | ABCEFGKL | 3E | 3G | 3B | 3C | 3A | 3F | 3L | 3K |
| 417 | ABCEFGJL | 3E | 3G | 3B | 3C | 3A | 3F | 3L | 3J |
| 418 | ABCEFGJK | 3E | 3G | 3B | 3C | 3A | 3F | 3J | 3K |
| 419 | ABCEFGIL | 3E | 3G | 3B | 3C | 3A | 3F | 3L | 3I |
| 420 | ABCEFGIK | 3E | 3G | 3B | 3C | 3A | 3F | 3I | 3K |
| 421 | ABCEFGIJ | 3E | 3G | 3B | 3C | 3A | 3F | 3I | 3J |
| 422 | ABCEFGHL | 3H | 3G | 3B | 3C | 3A | 3F | 3L | 3E |
| 423 | ABCEFGHK | 3H | 3G | 3B | 3C | 3A | 3F | 3E | 3K |
| 424 | ABCEFGHJ | 3H | 3G | 3B | 3C | 3A | 3F | 3E | 3J |
| 425 | ABCEFGHI | 3H | 3G | 3B | 3C | 3A | 3F | 3E | 3I |
| 426 | ABCDIJKL | 3I | 3J | 3B | 3C | 3A | 3D | 3L | 3K |
| 427 | ABCDHJKL | 3H | 3J | 3B | 3C | 3A | 3D | 3L | 3K |
| 428 | ABCDHIKL | 3H | 3I | 3B | 3C | 3A | 3D | 3L | 3K |
| 429 | ABCDHIJL | 3H | 3J | 3B | 3C | 3A | 3D | 3L | 3I |
| 430 | ABCDHIJK | 3H | 3J | 3B | 3C | 3A | 3D | 3I | 3K |
| 431 | ABCDGJKL | 3C | 3J | 3B | 3D | 3A | 3G | 3L | 3K |
| 432 | ABCDGIKL | 3I | 3G | 3B | 3C | 3A | 3D | 3L | 3K |
| 433 | ABCDGIJL | 3C | 3J | 3B | 3D | 3A | 3G | 3L | 3I |
| 434 | ABCDGIJK | 3C | 3J | 3B | 3D | 3A | 3G | 3I | 3K |
| 435 | ABCDGHKL | 3H | 3G | 3B | 3C | 3A | 3D | 3L | 3K |
| 436 | ABCDGHJL | 3H | 3G | 3B | 3C | 3A | 3D | 3L | 3J |
| 437 | ABCDGHJK | 3H | 3G | 3B | 3C | 3A | 3D | 3J | 3K |
| 438 | ABCDGHIL | 3H | 3G | 3B | 3C | 3A | 3D | 3L | 3I |
| 439 | ABCDGHIK | 3H | 3G | 3B | 3C | 3A | 3D | 3I | 3K |
| 440 | ABCDGHIJ | 3H | 3G | 3B | 3C | 3A | 3D | 3I | 3J |
| 441 | ABCDFJKL | 3C | 3J | 3B | 3D | 3A | 3F | 3L | 3K |
| 442 | ABCDFIKL | 3C | 3I | 3B | 3D | 3A | 3F | 3L | 3K |
| 443 | ABCDFIJL | 3C | 3J | 3B | 3D | 3A | 3F | 3L | 3I |
| 444 | ABCDFIJK | 3C | 3J | 3B | 3D | 3A | 3F | 3I | 3K |
| 445 | ABCDFHKL | 3H | 3F | 3B | 3C | 3A | 3D | 3L | 3K |
| 446 | ABCDFHJL | 3C | 3J | 3B | 3D | 3A | 3F | 3L | 3H |
| 447 | ABCDFHJK | 3H | 3J | 3B | 3C | 3A | 3F | 3D | 3K |
| 448 | ABCDFHIL | 3H | 3F | 3B | 3C | 3A | 3D | 3L | 3I |
| 449 | ABCDFHIK | 3H | 3F | 3B | 3C | 3A | 3D | 3I | 3K |
| 450 | ABCDFHIJ | 3H | 3J | 3B | 3C | 3A | 3F | 3D | 3I |
| 451 | ABCDFGKL | 3C | 3G | 3B | 3D | 3A | 3F | 3L | 3K |
| 452 | ABCDFGJL | 3C | 3G | 3B | 3D | 3A | 3F | 3L | 3J |
| 453 | ABCDFGJK | 3C | 3G | 3B | 3D | 3A | 3F | 3J | 3K |
| 454 | ABCDFGIL | 3C | 3G | 3B | 3D | 3A | 3F | 3L | 3I |
| 455 | ABCDFGIK | 3C | 3G | 3B | 3D | 3A | 3F | 3I | 3K |
| 456 | ABCDFGIJ | 3C | 3G | 3B | 3D | 3A | 3F | 3I | 3J |
| 457 | ABCDFGHL | 3C | 3G | 3B | 3D | 3A | 3F | 3L | 3H |
| 458 | ABCDFGHK | 3H | 3G | 3B | 3C | 3A | 3F | 3D | 3K |
| 459 | ABCDFGHJ | 3H | 3G | 3B | 3C | 3A | 3F | 3D | 3J |
| 460 | ABCDFGHI | 3H | 3G | 3B | 3C | 3A | 3F | 3D | 3I |
| 461 | ABCDEJKL | 3E | 3J | 3B | 3C | 3A | 3D | 3L | 3K |
| 462 | ABCDEIKL | 3E | 3I | 3B | 3C | 3A | 3D | 3L | 3K |
| 463 | ABCDEIJL | 3E | 3J | 3B | 3C | 3A | 3D | 3L | 3I |
| 464 | ABCDEIJK | 3E | 3J | 3B | 3C | 3A | 3D | 3I | 3K |
| 465 | ABCDEHKL | 3H | 3E | 3B | 3C | 3A | 3D | 3L | 3K |
| 466 | ABCDEHJL | 3H | 3J | 3B | 3C | 3A | 3D | 3L | 3E |
| 467 | ABCDEHJK | 3H | 3J | 3B | 3C | 3A | 3D | 3E | 3K |
| 468 | ABCDEHIL | 3H | 3E | 3B | 3C | 3A | 3D | 3L | 3I |
| 469 | ABCDEHIK | 3H | 3E | 3B | 3C | 3A | 3D | 3I | 3K |
| 470 | ABCDEHIJ | 3H | 3J | 3B | 3C | 3A | 3D | 3E | 3I |
| 471 | ABCDEGKL | 3E | 3G | 3B | 3C | 3A | 3D | 3L | 3K |
| 472 | ABCDEGJL | 3E | 3G | 3B | 3C | 3A | 3D | 3L | 3J |
| 473 | ABCDEGJK | 3E | 3G | 3B | 3C | 3A | 3D | 3J | 3K |
| 474 | ABCDEGIL | 3E | 3G | 3B | 3C | 3A | 3D | 3L | 3I |
| 475 | ABCDEGIK | 3E | 3G | 3B | 3C | 3A | 3D | 3I | 3K |
| 476 | ABCDEGIJ | 3E | 3G | 3B | 3C | 3A | 3D | 3I | 3J |
| 477 | ABCDEGHL | 3H | 3G | 3B | 3C | 3A | 3D | 3L | 3E |
| 478 | ABCDEGHK | 3H | 3G | 3B | 3C | 3A | 3D | 3E | 3K |
| 479 | ABCDEGHJ | 3H | 3G | 3B | 3C | 3A | 3D | 3E | 3J |
| 480 | ABCDEGHI | 3H | 3G | 3B | 3C | 3A | 3D | 3E | 3I |
| 481 | ABCDEFKL | 3C | 3E | 3B | 3D | 3A | 3F | 3L | 3K |
| 482 | ABCDEFJL | 3C | 3J | 3B | 3D | 3A | 3F | 3L | 3E |
| 483 | ABCDEFJK | 3C | 3J | 3B | 3D | 3A | 3F | 3E | 3K |
| 484 | ABCDEFIL | 3C | 3E | 3B | 3D | 3A | 3F | 3L | 3I |
| 485 | ABCDEFIK | 3C | 3E | 3B | 3D | 3A | 3F | 3I | 3K |
| 486 | ABCDEFIJ | 3C | 3J | 3B | 3D | 3A | 3F | 3E | 3I |
| 487 | ABCDEFHL | 3H | 3F | 3B | 3C | 3A | 3D | 3L | 3E |
| 488 | ABCDEFHK | 3H | 3E | 3B | 3C | 3A | 3F | 3D | 3K |
| 489 | ABCDEFHJ | 3H | 3J | 3B | 3C | 3A | 3F | 3D | 3E |
| 490 | ABCDEFHI | 3H | 3E | 3B | 3C | 3A | 3F | 3D | 3I |
| 491 | ABCDEFGL | 3C | 3G | 3B | 3D | 3A | 3F | 3L | 3E |
| 492 | ABCDEFGK | 3C | 3G | 3B | 3D | 3A | 3F | 3E | 3K |
| 493 | ABCDEFGJ | 3C | 3G | 3B | 3D | 3A | 3F | 3E | 3J |
| 494 | ABCDEFGI | 3C | 3G | 3B | 3D | 3A | 3F | 3E | 3I |
| 495 | ABCDEFGH | 3H | 3G | 3B | 3C | 3A | 3F | 3D | 3E |


## Part 2 — Integration notes for LigaBet

This section maps the format above to the current repo. The goal is to call out what already works, what needs new code, and where to put it. See [DOMAIN_MODEL.md](DOMAIN_MODEL.md) and [BACKEND_INTERNALS.md](BACKEND_INTERNALS.md) for the architectural baseline.

### 2.1 What the codebase already supports

The schema and domain layer were built for 32-team World Cups and UCL, but most pieces extend cleanly to a 48-team WC:

| Capability | Location | Status for WC 2026 |
|---|---|---|
| `Competition` with `type = WC` | `app/Competition.php:53` (`TYPE_WC = 'WC'`) | Reusable. New row with name `"World Cup 2026"`. |
| Game types: `group_stage` / `knockout` | `app/Game.php:67-68` | Reusable. |
| Knockout sub-types incl. **LAST_32** | `app/Enums/GameSubTypes.php` (LAST_32 already present) | Already supports R32 — no enum change needed. |
| `Group` 4-team grouping | `app/Group.php` | Reusable for 12 groups. |
| Per-match bets (BetMatch) | `app/Bets/BetMatch/BetMatchRequest.php` | Reusable. |
| Knockout qualifier bet (winner_side) | `app/Bets/BetMatch/BetMatchRequest.php:110` (`getKnockoutQualifier`) | Reusable for R32 onwards. |
| Special bets (top scorer, champion, etc.) | `app/SpecialBets/SpecialBet.php:77-86` (uses `FINAL` game) | Reusable. |
| Leaderboards & versions | `app/Leaderboard.php`, `app/LeaderboardsVersion.php` | Reusable. |
| Crawler for fixtures/scorers | `app/DataCrawler/Crawler.php` | Reusable; verify the source API exposes a `competition` id for FWC 2026. |
| `ko_leg` for two-legged ties | `app/Game.php:91-99` | Not used for World Cup (single-leg KO). Safe to leave null. |

### 2.2 What needs to be added or revisited

**A. Data seeding for the tournament**

1. New `competitions` row: `name = "World Cup 2026"`, `type = WC`, `start_time`, `last_registration`, `emblem`.
2. Seed **48 teams** linked to the competition via `groups`. Group IDs A–L (the migration `2022_07_31_235034_change_group_id_to_int_in_teams_table.php` made `group_id` an int — confirm the existing seed encodes group labels consistently).
3. Seed **104 games**:
   - 72 group-stage games following the matrix in §1.2 (Article 12.4).
   - 16 R32 games with `sub_type = LAST_32`. The home/away team IDs cannot be filled at seed time — they resolve only after group stage completes (see C below). Seed placeholders or defer game creation until standings are known.
   - 8 R16, 4 QF, 2 SF, 1 third-place playoff, 1 Final.

**B. `competition.config` adjustments**

Add a config block describing the 12-group / 8-best-3rd format so frontend rendering, fixture generation, and the leaderboard flow can branch without hardcoding "8 groups":

```json
{
  "format": {
    "groupsCount": 12,
    "groupSize": 4,
    "qualifiers": {
      "winners": 12,
      "runnersUp": 12,
      "bestThirds": 8,
      "thirdsPoolSize": 12
    },
    "knockoutStages": ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"]
  }
}
```

**C. New: third-place ranking + Annex C resolver**

This is the only piece of genuinely new logic. Suggested home: a new action `app/Actions/ResolveRoundOf32.php` (matching the existing command-pattern convention in `app/Actions/`).

Responsibilities:

1. After all 72 group matches are marked `is_done`, compute the 12 third-placed teams.
2. Apply Article 13 step-2/3 rules to rank them. The fair-play card-deduction logic does **not** currently exist in the codebase — needs implementation. Yellow/red counts are available via `game_data_goals` / disciplinary data (verify the crawler surfaces cards; if not, this is a crawler gap).
3. Select top 8.
4. Look up Annex C → produce 8 (winner ↔ 3rd-place) pairings.
5. Combine with the static Category 1 + Category 2 pairings to fill in all 16 R32 games' team IDs.

**The Annex C data is already transcribed and validated** — see [`WORLD_CUP_2026_ANNEX_C.json`](WORLD_CUP_2026_ANNEX_C.json) at the repo root (also rendered as a table in §1.7 above). Schema:

```jsonc
{
  "winners": ["1A","1B","1D","1E","1G","1I","1K","1L"],
  "winner_pools": { "1E": "ABCDF", "1I": "CDFGH", /* ... */ },
  "by_option": {
    "1": {
      "surviving_thirds": ["E","F","G","H","I","J","K","L"],
      "pairings": { "1A":"3E", "1B":"3J", "1D":"3I", "1E":"3F",
                    "1G":"3H", "1I":"3G", "1K":"3L", "1L":"3K" }
    }
    // ... 495 entries total
  },
  "by_surviving_thirds": { "EFGHIJKL": "1", "DFGHIJKL": "2", /* ... */ }
}
```

To resolve the bracket at runtime: read this JSON, compute the surviving-thirds set from the 12 group standings, sort the 8 group letters, concatenate → `by_surviving_thirds[key]` → `by_option[N].pairings`. Combine with the static Category 1 and Category 2 pairings from §1.5 to fill in all 16 R32 games. Copy the file into `database/fixtures/` (or another runtime-assets location) when wiring it up — it's data, not docs. The `validated` block inside the file records the integrity checks performed at transcription time.

**D. Tiebreakers**

Existing tiebreaker logic for group standings: re-audit against Article 13. In particular:

- Confirm that step 1 head-to-head (points → GD → goals) is computed only among the tied teams, then **falls back to overall** if still tied (step 2). Several past WC implementations conflate these.
- Implement the **fair-play conduct score** (step 2.f). Requires per-player card data per game.
- Implement the **FIFA ranking fallback** (step 3). The current crawler does not appear to pull FIFA rankings — this would be a new data source.

**E. Bet types and scoring config**

`config.scores` per [BET_SCORING.md](BET_SCORING.md) currently scopes match scores by stage (group / knockout). Decisions to make:

- Should R32 use the same `scores.gameBets.knockout.*` block as R16+, or get its own block? Recommend a single `knockout` block for now (R32 is just one more KO round) and only split if product wants different weighting.
- "Best 3rd-placed teams" — should this be a new SpecialBet sub-type ("predict which 8 groups produce best 3rds")? Optional, not required by FIFA but a natural bet type for this format.
- Champion / runner-up / top scorer / Golden Boot SpecialBets already work (`getKnockoutWinner` / `getKnockoutLoser` on the FINAL game).

**F. Frontend (React/Redux)**

See [FRONTEND.md](FRONTEND.md). Touch points:

- Group rendering: must handle 12 groups (current layouts likely assume 8 — check column counts, mobile layouts).
- Bracket view: needs a 32-team bracket layout (today's bracket components likely render 16).
- Bet entry pages for R32 fixtures (auto-generated once R32 teams are known via the resolver in C).
- Translations: any hardcoded Hebrew labels referencing "round of 16" as the first KO round.

**G. Crawler**

`app/DataCrawler/Crawler.php` fetches fixtures + scores by competition id. For FWC 2026:

- Find the source API's competition id for the 2026 edition.
- Verify the API exposes cards (needed for tiebreaker f) — recent commit `9f3b9d9 Crawler - do not consider penalties goals` suggests the crawler is being actively tuned; piggyback on that work.
- For R32 games whose teams are placeholders pre-group-stage, decide whether the crawler creates them eagerly or whether the resolver in C is the sole creator.

### 2.3 Suggested implementation order

1. Seed competition, 48 teams, 12 groups, 72 group-stage games.
2. Add `competition.config.format` and update consumers to read it instead of hardcoding 8.
3. Front-end: 12-group rendering.
4. Audit + extend group tiebreakers per Article 13 (step 1 vs step 2 split, fair-play, FIFA ranking fallback).
5. Transcribe Annex C into a JSON fixture (one-time).
6. Implement `ResolveRoundOf32` action (creates R32 game rows once group stage is `is_done` for all 72 games).
7. Bracket view + R32/R16/QF/SF/Third/Final game pages.
8. Optional: new SpecialBet sub-type for "best 3rd-placed teams" / "groups producing best 3rds".

### 2.4 Out of scope / non-changes

- `ko_leg` two-legged-tie machinery (`app/Game.php:91-99`) — not used by World Cup, leave null. Touching it is out of scope.
- Substitution and squad-size rules are FIFA match-day operational rules, not relevant to the betting model.
- Concacaf 6-team play-off tournament is part of qualification, not the final tournament — out of scope unless the app wants to bet on qualifying.

---

## Open questions for product / design

These aren't answered by the regulations and need a decision before implementation:

1. Do we bet on individual R32 matches the same way as R16+, or treat R32 as a separate scoring tier?
2. Do we add a SpecialBet for "predict the 8 best 3rd-placed groups"? It maps naturally to the Annex C mechanic.
3. Group-stage tiebreaker visibility — does the UI need to surface tiebreaker steps (fair-play points, FIFA ranking) to users, or only the final ranking?
4. How does the crawler handle R32 fixtures before the resolver runs — does it ingest TBD placeholders, or do we suppress those games until resolved?
