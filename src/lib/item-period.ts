// Items that look back on a financial period (statements, dividends, annual
// report) cannot be decided before that period has ended.

const MONTHS: Record<string, number> = {
  يناير: 1, فبراير: 2, مارس: 3, ابريل: 4, أبريل: 4, إبريل: 4, مايو: 5, يونيو: 6, يوليو: 7, اغسطس: 8, أغسطس: 8, سبتمبر: 9, اكتوبر: 10, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
};
const LOOKS_BACK = /(القوائم المالي[ةه]|البيانات المالي[ةه]|الحسابات الختامي[ةه]|التقرير السنوي|تقرير مجلس الإدار[ةه]|توزيع|ارباح|أرباح|النتائج المالي[ةه])/;
const ENDS_ON = /المنتهي[ةه] في (\d{1,2}) ([\p{L}]+) (\d{4})/u;
const FISCAL_YEAR = /(?:العام المالي|السن[ةه] المالي[ةه]|عام)\s*\(?(\d{4})\)?/;

const pad = (n: number) => String(n).padStart(2, "0");

/** The last day (YYYY-MM-DD) of the period a backward-looking item names, if it names one. */
export function periodEnd(title: string): string | null {
  if (!LOOKS_BACK.test(title)) return null;
  const end = title.match(ENDS_ON);
  if (end && MONTHS[end[2]]) return `${end[3]}-${pad(MONTHS[end[2]])}-${pad(Number(end[1]))}`;
  const year = title.match(FISCAL_YEAR);
  return year ? `${year[1]}-12-31` : null;
}

/** Whether the item's period is still running on the meeting day. */
export const periodNotEnded = (title: string, meetingDay: string) => {
  const end = periodEnd(title);
  return !!end && end >= meetingDay;
};

const DMY = /(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{4})(?!\d)/g;
const DAY_MONTH = /(?<!المنتهي[ةه] في )(?<!\d)(\d{1,2}) ([\p{L}]+) (\d{4})/gu;

/** Dates written in the item (20/10/2026, 1 مايو 2027), except the period end itself. */
export function datesIn(title: string): string[] {
  const out: string[] = [];
  for (const [, d, mo, y] of title.matchAll(DMY)) if (Number(mo) >= 1 && Number(mo) <= 12) out.push(`${y}-${pad(Number(mo))}-${pad(Number(d))}`);
  for (const [, d, name, y] of title.matchAll(DAY_MONTH)) if (MONTHS[name]) out.push(`${y}-${pad(MONTHS[name])}-${pad(Number(d))}`);
  return out;
}

/** Dates in the item that cannot be right: before the meeting, or before the period they belong to has ended. */
const shown = (iso: string) => iso.split("-").reverse().join("/");

export function dateProblems(title: string, meetingDay: string): string[] {
  const end = periodEnd(title);
  const problems: string[] = [];
  for (const date of datesIn(title)) {
    if (end && date <= end) problems.push(`${shown(date)} قبل نهاية الفترة في ${shown(end)}`);
    else if (date < meetingDay) problems.push(`${shown(date)} قبل موعد الاجتماع`);
  }
  return problems;
}

/** Years in a meeting title that lie after the meeting's own year (e.g. "للسنة المالية 2028" in a 2026 meeting). */
export const yearsAhead = (title: string, meetingDay: string) => [...title.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)].map((m) => Number(m[1])).filter((y) => y > Number(meetingDay.slice(0, 4)));
