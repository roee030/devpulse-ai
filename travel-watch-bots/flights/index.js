import 'dotenv/config';
import cron from 'node-cron';
import { flightsConfig } from '../config.js';
import { serpApiSearch } from '../lib/serpapi.js';
import { sendMessage } from '../lib/telegram.js';
import { maybeSummarize } from '../lib/summary.js';
import { formatILS, formatShortDate, addDays, sampleDates } from '../lib/format.js';

const STOPS_LABEL = { 0: '', 1: 'ישיר', 2: '≤1 עצירה', 3: '≤2 עצירות' };

function googleFlightsUrl(data, origin, destination, outboundDate, returnDate) {
  if (data?.search_metadata?.google_flights_url) return data.search_metadata.google_flights_url;
  return `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}%20on%20${outboundDate}%20through%20${returnDate}`;
}

function parseFlightOptions(data, origin, destination, outboundDate, returnDate) {
  const raw = [...(data.best_flights || []), ...(data.other_flights || [])];
  const link = googleFlightsUrl(data, origin, destination, outboundDate, returnDate);

  return raw
    .filter((opt) => typeof opt.price === 'number')
    .map((opt) => {
      const legs = opt.flights || [];
      const airlines = [...new Set(legs.map((leg) => leg.airline).filter(Boolean))];
      return {
        origin,
        destination,
        outboundDate,
        returnDate,
        price: opt.price,
        airlines,
        stops: Math.max(0, legs.length - 1),
        totalDurationMin: opt.total_duration,
        link,
      };
    });
}

async function fetchOptionsForDate(watch, destination, outboundDate) {
  const returnDate = addDays(outboundDate, watch.tripLength.min);
  const data = await serpApiSearch({
    engine: 'google_flights',
    departure_id: watch.origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: 1,
    currency: flightsConfig.currency,
    hl: flightsConfig.hl,
    gl: flightsConfig.gl,
    stops: watch.stops || 0,
    travel_class: watch.travelClass || 1,
    adults: watch.adults || 1,
  });
  return parseFlightOptions(data, watch.origin, destination, outboundDate, returnDate);
}

function formatFlightsMessage(watch, options) {
  const lines = [`✈️ *${watch.name}*`];
  options.forEach((opt, i) => {
    const stopsLabel = STOPS_LABEL[Math.min(opt.stops, 3)] || `${opt.stops} עצירות`;
    const airlines = opt.airlines.join('+') || '?';
    lines.push(
      `${i + 1}) ${opt.destination} | ${formatShortDate(opt.outboundDate)}→${formatShortDate(opt.returnDate)} | ${formatILS(opt.price)} | ${airlines} | ${stopsLabel}`
    );
    lines.push(`   🔗 ${opt.link}`);
  });
  return lines.join('\n');
}

async function runWatch(watch) {
  const destinations = watch.destinations || [];
  const pairs = destinations.map((destination) => ({ watch, destination }));
  const perPairBudget = Math.max(1, Math.floor(flightsConfig.maxSerpApiCallsPerRun / Math.max(1, pairs.length)));

  let allOptions = [];
  for (const { destination } of pairs) {
    const dates = sampleDates(watch.outboundDateWindow.start, watch.outboundDateWindow.end, perPairBudget);
    for (const outboundDate of dates) {
      try {
        const options = await fetchOptionsForDate(watch, destination, outboundDate);
        allOptions.push(...options);
      } catch (err) {
        console.error(`[flights] ${watch.name} / ${destination} / ${outboundDate} failed:`, err.message);
      }
    }
  }

  allOptions.sort((a, b) => a.price - b.price);

  const selected =
    flightsConfig.alertMode === 'cheapestN'
      ? allOptions.slice(0, flightsConfig.cheapestN)
      : allOptions.filter((opt) => opt.price <= watch.maxPriceILS);

  if (selected.length === 0) {
    console.log(`[flights] ${watch.name}: no matching options this run`);
    return;
  }

  const text = await maybeSummarize(formatFlightsMessage(watch, selected));
  await sendMessage(text);
}

export async function main() {
  for (const watch of flightsConfig.watches) {
    try {
      await runWatch(watch);
    } catch (err) {
      console.error(`[flights] watch "${watch.name}" failed:`, err.message);
      await sendMessage(`⚠️ טיסות - שגיאה ב"${watch.name}": ${err.message}`).catch((e) =>
        console.error('[flights] failed to send error alert:', e.message)
      );
    }
  }
}

main().catch((err) => console.error('[flights] run failed:', err));

if ((process.env.RUN_MODE || 'once') === 'cron') {
  cron.schedule(flightsConfig.cronExpression, () => main().catch((err) => console.error('[flights] run failed:', err)), {
    timezone: process.env.TZ || 'Asia/Jerusalem',
  });
  console.log(`[flights] cron scheduled: "${flightsConfig.cronExpression}" (${process.env.TZ || 'Asia/Jerusalem'})`);
}
