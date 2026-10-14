// Every number and date in the product uses Latin digits (0-9), in Saudi time.

const TIME_ZONE = "Asia/Riyadh";

const numberFormat = new Intl.NumberFormat("ar-SA-u-nu-latn");

const gregorianFormat = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const hijriFormat = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormat = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** e.g. "الأربعاء، 14 أكتوبر 2026" */
export function formatGregorianDate(date: Date): string {
  return gregorianFormat.format(date);
}

/** e.g. "14 أكتوبر 2026، 3:00 م" */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

/** e.g. "3 جمادى الأولى 1448 هـ" */
export function formatHijriDate(date: Date): string {
  return hijriFormat.format(date);
}

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** Converts Arabic-Indic and Persian digits typed by users to Latin digits. */
export function toLatinDigits(value: string): string {
  return value.replace(ARABIC_INDIC, (digit) =>
    String(digit.charCodeAt(0) & 0xf),
  );
}
