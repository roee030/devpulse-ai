// All watch targets for both bots live here. Edit this file to add/remove watches —
// flights and hotels are independent arrays, touch only the one you need.

export const flightsConfig = {
  cronExpression: process.env.FLIGHTS_CRON || '0 7 * * *',
  // Hard cap on SerpApi calls per run (free-tier discipline). Shared across every
  // origin/destination pair and every sampled date in the window below.
  maxSerpApiCallsPerRun: Number(process.env.FLIGHTS_MAX_SERPAPI_CALLS || 8),
  // 'threshold': send only options at/under a watch's maxPriceILS.
  // 'cheapestN': ignore the threshold and always send the N cheapest options found.
  alertMode: 'threshold',
  cheapestN: 3,
  hl: 'iw',
  gl: 'il',
  currency: 'ILS',
  watches: [
    {
      name: 'TLV → בודפשט (ספטמבר, גמיש)',
      origin: 'TLV',
      destinations: ['BUD'],
      // Flexible outbound window — the bot samples dates inside this range.
      outboundDateWindow: { start: '2026-09-01', end: '2026-09-15' },
      // Trip length range in days. The bot uses the minimum to build return dates,
      // to keep one SerpApi call per sampled outbound date (see README).
      tripLength: { min: 4, max: 7 },
      maxPriceILS: 1200,
      // 0 = any number of stops, 1 = nonstop only, 2 = 1 stop or fewer, 3 = 2 stops or fewer.
      stops: 2,
      travelClass: 1, // 1 economy, 2 premium economy, 3 business, 4 first
      adults: 1,
    },
  ],
};

export const hotelsConfig = {
  cronExpression: process.env.HOTELS_CRON || '0 8 * * *',
  maxSerpApiCallsPerRun: Number(process.env.HOTELS_MAX_SERPAPI_CALLS || 6),
  hl: 'iw',
  gl: 'il',
  currency: 'ILS',
  watches: [
    {
      name: 'מלונות באזור קיסריה',
      query: 'מלונות באזור קיסריה',
      // Multiple check-in/check-out pairs for flexibility — one SerpApi call per pair.
      dates: [
        { checkIn: '2026-09-10', checkOut: '2026-09-12' },
        { checkIn: '2026-09-17', checkOut: '2026-09-19' },
      ],
      maxPricePerNightILS: 700,
      minRating: 4.0,
      adults: 2,
    },
  ],
};
