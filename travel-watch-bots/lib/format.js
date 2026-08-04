export function formatILS(amount) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '?';
  return `${Math.round(amount).toLocaleString('he-IL')}₪`;
}

export function formatShortDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateRangeDays(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
}

// Evenly samples up to `count` dates (inclusive) between startIso and endIso.
// Always includes at least the start date; returns fewer than `count` if the
// window is shorter than `count` days.
export function sampleDates(startIso, endIso, count) {
  const totalDays = Math.max(1, dateRangeDays(startIso, endIso));
  const n = Math.max(1, Math.min(count, totalDays));
  const dates = [];
  for (let i = 0; i < n; i++) {
    const offset = n === 1 ? 0 : Math.round((i * (totalDays - 1)) / (n - 1));
    dates.push(addDays(startIso, offset));
  }
  return [...new Set(dates)];
}
