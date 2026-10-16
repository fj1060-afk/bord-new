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
