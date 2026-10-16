// Dates the board dashboard watches beyond the compliance rules: notifying
// the CMA of board changes (CGR Art. 17/d) and directors' trading blackout
// periods (Rules on the Offer of Securities and Continuing Obligations Art. 86).

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The date `n` business days after `date`; the Saudi weekend is Friday and Saturday. */
export function addBusinessDays(date: string, n: number): string {
  let t = Date.parse(`${date}T12:00:00Z`);
  let left = n;
  while (left > 0) {
    t += DAY;
    const day = new Date(t).getUTCDay();
    if (day !== 5 && day !== 6) left--;
  }
  return iso(t);
}

/** Members who joined recently: the CMA is to be told within five business days. */
export function cmaNotices(members: { name: string; start_date: string }[], today: string) {
  return members
    .map((m) => ({ ...m, due: addBusinessDays(m.start_date, 5) }))
    .filter((m) => m.start_date <= today && Date.parse(today) - Date.parse(m.start_date) <= 30 * DAY)
    .map((m) => ({ ...m, overdue: m.due < today }));
}

const lastDayOf = (year: number, month: number) => iso(Date.UTC(year, month, 0, 12));

/**
 * Blackout windows around the next period ends: 15 days before each quarter
 * end and 30 before the year end, lasting until the statements are disclosed.
 * Returns the window in force today, if any, and the next one.
 */
export function blackouts(fiscalEndMonth: number, today: string) {
  const year = Number(today.slice(0, 4));
  const ends: { end: string; annual: boolean }[] = [];
  for (const y of [year - 1, year, year + 1])
    for (let q = 0; q < 4; q++) {
      const month = ((fiscalEndMonth + 3 * q - 1) % 12) + 1;
      ends.push({ end: lastDayOf(month > fiscalEndMonth ? y - 1 : y, month), annual: q === 0 });
    }
  const windows = [...new Map(ends.map((e) => [e.end, e])).values()]
    .sort((a, b) => a.end.localeCompare(b.end))
    .map((e) => ({ ...e, start: iso(Date.parse(`${e.end}T12:00:00Z`) - (e.annual ? 30 : 15) * DAY) }));
  const next = windows.find((w) => w.start > today) ?? null;
  // In force from its start; after the period end it lasts until disclosure, which the system does not know.
  const now = windows.filter((w) => w.start <= today && today <= w.end).at(-1) ?? null;
  const pending = windows.filter((w) => w.end < today).at(-1) ?? null;
  return { now, next, pending };
}
