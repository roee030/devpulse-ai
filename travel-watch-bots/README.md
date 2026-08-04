# Travel Watch Bots

Two **independent** Telegram bots that watch prices via [SerpApi](https://serpapi.com):

- `flights/index.js` — Google Flights, config-driven watches with flexible date windows.
- `hotels/index.js` — Google Hotels, config-driven watches with multiple date pairs.

They share nothing but `/lib` utilities (Telegram sender, optional LLM summarizer, SerpApi
fetch wrapper, formatting helpers) and never call each other. Run, deploy, or disable one
without touching the other.

Search and filtering use **zero LLM tokens** — pure SerpApi JSON + local formatting.
Telegram messages default to terse, telegraphic Hebrew ("caveman style"): route/hotel,
price, dates, link — nothing else. Set `USE_LLM_SUMMARY=true` to have `claude-haiku-4-5`
rewrite that same text as one short Hebrew line instead (off by default).

## Setup

```bash
cd travel-watch-bots
npm install
cp .env.example .env   # fill in the values below
```

Edit `config.js` to add/remove/adjust watches — flights and hotels are separate arrays.

Run once (what GitHub Actions does):

```bash
npm run start:flights
npm run start:hotels
```

Run as a long-lived process with internal scheduling (what Railway does): set
`RUN_MODE=cron` in `.env`, then run the same commands — each process runs once
immediately on boot, then re-runs on its own cron schedule (`FLIGHTS_CRON` /
`HOTELS_CRON`, default 07:00 / 08:00 `Asia/Jerusalem`).

## Required secrets

| Variable | How to get it |
|---|---|
| `SERPAPI_API_KEY` | [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key) — free tier included |
| `TELEGRAM_BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → copy the token it gives you |
| `TELEGRAM_CHAT_ID` | See below |
| `ANTHROPIC_API_KEY` | Only if `USE_LLM_SUMMARY=true` — [console.anthropic.com](https://console.anthropic.com) |

### How to get `TELEGRAM_CHAT_ID`

1. Create your bot via @BotFather (above) and send it **any message** (e.g. "hi") from
   the Telegram account/group you want alerts in.
2. Visit `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates` in a browser.
3. Find `"chat":{"id":...}` in the JSON — that number is `TELEGRAM_CHAT_ID` (negative for
   groups, positive for a direct message with the bot).
4. For a group: add the bot to the group first, send a message there, then repeat step 2.

## Deploying

### Option A — GitHub Actions cron (no always-on server)

Workflow files are already included at the repo root:
`.github/workflows/travel-watch-flights.yml` and `.github/workflows/travel-watch-hotels.yml`.
Each runs `npm run start:flights` / `start:hotels` once (`RUN_MODE=once`, the default) on a
UTC cron schedule and exits — nothing stays running between runs.

1. In the GitHub repo: **Settings → Secrets and variables → Actions** → add
   `SERPAPI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and optionally
   `ANTHROPIC_API_KEY`.
2. (Optional) add repo variable `USE_LLM_SUMMARY=true` under **Variables** to enable the
   Haiku rewrite.
3. The schedules fire automatically; use **Actions → workflow → Run workflow** to trigger
   manually. GitHub Actions cron always runs in UTC — the committed schedules approximate
   07:00 / 08:00 `Asia/Jerusalem` but drift ±1h across Israel's DST transitions since GitHub
   doesn't support timezone-aware cron. Adjust the `cron:` lines if exact timing matters.

### Option B — Railway (always-on)

1. Create a new Railway service per bot (two services, same repo), each with **root
   directory** `travel-watch-bots` and start command `npm run start:flights` or
   `npm run start:hotels`.
2. Set the env vars from `.env.example` in each service, and set `RUN_MODE=cron` so the
   process schedules its own recurring runs instead of exiting after one.
3. Deploy — each service runs once immediately, then on its configured cron.

## Free-tier call discipline

SerpApi's free tier has a limited monthly quota, so both bots cap total calls per run:

- **Flights**: no single SerpApi engine call accepts a date *range* and returns priced
  round trips for the whole window in one shot, so the flexible window is covered by
  sampling individual dates (evenly spaced across `outboundDateWindow`) and taking the
  cheapest result found. `maxSerpApiCallsPerRun` (config.js) / `FLIGHTS_MAX_SERPAPI_CALLS`
  (.env) bounds the total calls across every origin/destination pair and every sampled
  date in one run — raise it for denser coverage, lower it to conserve quota. Each sampled
  date uses `tripLength.min` to build the return date (not the full min/max range) to keep
  one call per sampled date instead of one per (date × length) combination — set
  `tripLength.min === tripLength.max` for a fixed trip length, or widen the range and accept
  coarser date sampling.
- **Hotels**: one SerpApi call per configured `checkIn`/`checkOut` pair, capped by
  `maxSerpApiCallsPerRun` / `HOTELS_MAX_SERPAPI_CALLS`. Price/rating filtering happens
  locally after the call, not via SerpApi query params.

## Config reference (`config.js`)

**Flights watch:**
- `origin` — 3-letter airport code (e.g. `TLV`).
- `destinations` — array of 3-letter codes; budget is split evenly across them.
- `outboundDateWindow: { start, end }` — flexible departure window (`YYYY-MM-DD`).
- `tripLength: { min, max }` — trip length in days (currently `min` is used to build the
  return date for each sampled outbound date — see above).
- `maxPriceILS` — alert threshold.
- `stops` — `0` any, `1` nonstop, `2` ≤1 stop, `3` ≤2 stops.
- `travelClass` — `1` economy, `2` premium economy, `3` business, `4` first.
- `adults`.

**Hotels watch:**
- `query` — free-text location (e.g. `"מלונות באזור קיסריה"`).
- `dates` — array of `{ checkIn, checkOut }` pairs.
- `maxPricePerNightILS`, `minRating` — local filters applied after fetch.
- `adults`.

`flightsConfig.alertMode`: `'threshold'` sends only options at/under `maxPriceILS`;
`'cheapestN'` ignores the threshold and always sends the `cheapestN` cheapest options found.

## Errors

Any failure (bad watch config, SerpApi error, network issue) is caught per-watch: it's
logged to stdout and a short `⚠️` Telegram message is sent, but never crashes the run or
blocks other watches/modules.

## SerpApi parameters — verified vs. assumed

`serpapi.com` returned HTTP 403 to this session's fetch tools (bot-blocked), so the exact
current docs couldn't be read directly. Parameters below are corroborated via search-engine
snippets of SerpApi's own pages/blog plus well-established API knowledge, but weren't
confirmed against a live response. Before relying on this in production, run each watch once
and eyeball the raw JSON (`console.log` it in `fetchOptionsForDate`/`fetchOptionsForDates`) —
flagged items below are the most likely to need a tweak:

- `hl=iw` for Hebrew — Google's own language-code table uses `iw` (not `he`) for Hebrew;
  assumed SerpApi passes it through unchanged. Unverified against a live call.
- `google_flights` round trip: this implementation sends `outbound_date` **and**
  `return_date` in one call and expects `best_flights`/`other_flights` to already contain
  full round-trip priced itineraries. Some SerpApi documentation instead describes a
  two-step flow (`departure_token` from an outbound-only search, fed into a second call to
  get return options + price) — if the single-call price looks wrong, that's the fallback.
- A separate `google_flights_deals` engine appears to natively accept a comma-separated
  flexible `outbound_date` range and a `trip_length` range in a single call, which would
  remove the need for date sampling entirely — its response shape (destination-explorer
  style: `deals[]` with `destination_id`/`discount_percentage`) looked oriented at "explore
  many destinations from one origin" rather than "cheapest date for one fixed route," so
  this build didn't adopt it, but it's worth reading directly at
  `serpapi.com/google-flights-deals-api` before scaling up watches.
- `google_hotels` booking link: uses `properties[].link` when present, else
  `search_metadata.google_hotels_url`, else a constructed Google Hotels search URL. Field
  name for a direct per-property link wasn't independently confirmed.
- `rate_per_night.extracted_lowest` — assumed to be per-night, pre-tax price in the request
  currency; SerpApi also exposes `total_rate` (stay total) as an alternative if per-night
  turns out to mean something else in practice.
