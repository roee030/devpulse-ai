import 'dotenv/config';
import cron from 'node-cron';
import { hotelsConfig } from '../config.js';
import { serpApiSearch } from '../lib/serpapi.js';
import { sendMessage } from '../lib/telegram.js';
import { maybeSummarize } from '../lib/summary.js';
import { formatILS, formatShortDate } from '../lib/format.js';

function googleHotelsUrl(data, property, query, checkIn, checkOut) {
  if (property?.link) return property.link;
  if (data?.search_metadata?.google_hotels_url) return data.search_metadata.google_hotels_url;
  return `https://www.google.com/travel/hotels?q=${encodeURIComponent(query)}&checkin=${checkIn}&checkout=${checkOut}`;
}

function parseProperties(data, watch, checkIn, checkOut) {
  const properties = data.properties || [];
  return properties
    .map((p) => ({
      name: p.name,
      pricePerNight: p.rate_per_night?.extracted_lowest,
      rating: p.overall_rating,
      hotelClass: p.hotel_class,
      checkIn,
      checkOut,
      link: googleHotelsUrl(data, p, watch.query, checkIn, checkOut),
    }))
    .filter((p) => typeof p.pricePerNight === 'number');
}

async function fetchOptionsForDates(watch, checkIn, checkOut) {
  const data = await serpApiSearch({
    engine: 'google_hotels',
    q: watch.query,
    check_in_date: checkIn,
    check_out_date: checkOut,
    currency: hotelsConfig.currency,
    hl: hotelsConfig.hl,
    gl: hotelsConfig.gl,
    adults: watch.adults || 2,
    sort_by: 3, // lowest price first
  });
  return parseProperties(data, watch, checkIn, checkOut);
}

function formatHotelsMessage(watch, options) {
  const lines = [`🏨 *${watch.name}*`];
  options.forEach((opt, i) => {
    const stars = opt.hotelClass ? ` | ${opt.hotelClass}` : '';
    lines.push(
      `${i + 1}) ${opt.name} | ${formatShortDate(opt.checkIn)}→${formatShortDate(opt.checkOut)} | ${formatILS(opt.pricePerNight)}/לילה | ⭐${opt.rating ?? '?'}${stars}`
    );
    lines.push(`   🔗 ${opt.link}`);
  });
  return lines.join('\n');
}

async function runWatch(watch) {
  const dates = watch.dates || [];
  const callBudget = Math.max(1, Math.min(dates.length, hotelsConfig.maxSerpApiCallsPerRun));

  let allOptions = [];
  for (const { checkIn, checkOut } of dates.slice(0, callBudget)) {
    try {
      const options = await fetchOptionsForDates(watch, checkIn, checkOut);
      allOptions.push(...options);
    } catch (err) {
      console.error(`[hotels] ${watch.name} / ${checkIn}-${checkOut} failed:`, err.message);
    }
  }

  const filtered = allOptions
    .filter((opt) => opt.pricePerNight <= watch.maxPricePerNightILS && (opt.rating ?? 0) >= watch.minRating)
    .sort((a, b) => a.pricePerNight - b.pricePerNight);

  if (filtered.length === 0) {
    console.log(`[hotels] ${watch.name}: no matching options this run`);
    return;
  }

  const text = await maybeSummarize(formatHotelsMessage(watch, filtered));
  await sendMessage(text);
}

export async function main() {
  for (const watch of hotelsConfig.watches) {
    try {
      await runWatch(watch);
    } catch (err) {
      console.error(`[hotels] watch "${watch.name}" failed:`, err.message);
      await sendMessage(`⚠️ מלונות - שגיאה ב"${watch.name}": ${err.message}`).catch((e) =>
        console.error('[hotels] failed to send error alert:', e.message)
      );
    }
  }
}

main().catch((err) => console.error('[hotels] run failed:', err));

if ((process.env.RUN_MODE || 'once') === 'cron') {
  cron.schedule(hotelsConfig.cronExpression, () => main().catch((err) => console.error('[hotels] run failed:', err)), {
    timezone: process.env.TZ || 'Asia/Jerusalem',
  });
  console.log(`[hotels] cron scheduled: "${hotelsConfig.cronExpression}" (${process.env.TZ || 'Asia/Jerusalem'})`);
}
