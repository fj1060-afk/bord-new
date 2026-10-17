// Rules for email addresses and mobile numbers, shared by every form and its
// server action. Numbers are stored in one international form (+9665XXXXXXXX
// for Saudi mobiles) whatever way they were typed.

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const latin = (s: string) => s.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));

export const EMAIL_MAX = 254;

/** Trimmed and lower-cased; Arabic digits become Latin. */
export const normalizeEmail = (raw: string) => latin(raw).trim().toLowerCase();

/** Why an email is not acceptable, or null. Empty is left to `required`. */
export function emailProblem(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return null;
  if (email.length > EMAIL_MAX) return "البريد الإلكتروني أطول من المسموح.";
  if (/\s/.test(email)) return "البريد الإلكتروني لا يحتوي مسافات.";
  if (/[^\x21-\x7e]/.test(email)) return "اكتب البريد الإلكتروني بأحرف إنجليزية.";
  const m = email.match(/^([^@]+)@([^@]+)$/);
  if (!m) return "البريد الإلكتروني يحتاج @ واحدة بين الاسم والنطاق، مثل name@company.com.";
  const [, local, domain] = m;
  if (local.length > 64 || /^\.|\.$|\.\./.test(local)) return "الجزء قبل @ غير صحيح.";
  if (!domain.includes(".")) return "النطاق ينتهي بامتداد مثل ‎.com أو ‎.sa.";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || /(^|\.)-|-(\.|$)/.test(domain)) return "النطاق بعد @ غير صحيح، مثل company.com.";
  if (!/\.[a-z]{2,}$/.test(domain)) return "النطاق ينتهي بامتداد مثل ‎.com أو ‎.sa.";
  return null;
}

/**
 * A mobile number in international form, or null when it cannot be read.
 * Saudi mobiles may be typed as 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX,
 * 009665XXXXXXXX or +9665XXXXXXXX; other countries need their + code.
 */
export function normalizePhone(raw: string): string | null {
  let s = latin(raw).replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (/^05\d{8}$/.test(s)) return `+966${s.slice(1)}`;
  if (/^5\d{8}$/.test(s)) return `+966${s}`;
  if (/^9665\d{8}$/.test(s)) return `+${s}`;
  if (/^\+9665\d{8}$/.test(s)) return s;
  if (/^\+966/.test(s)) return null; // a Saudi number that is not a valid mobile
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

/** Why a mobile number is not acceptable, or null. Empty is left to `required`. */
export function phoneProblem(raw: string): string | null {
  if (!latin(raw).trim()) return null;
  return normalizePhone(raw) ? null : "رقم الجوال غير صحيح: اكتب 05XXXXXXXX، أو الرقم الدولي مع + لغير السعودية.";
}

/** "+966501234567" → "+966 50 123 4567" for display. */
export function formatPhone(phone: string): string {
  const m = phone.match(/^\+966(5\d)(\d{3})(\d{4})$/);
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

/** Reads, checks and normalizes the email and phone fields of a form. */
export function contactFields(form: FormData, keys: { email?: string; phone?: string } = { email: "email", phone: "phone" }): { email: string | null; phone: string | null; problem: string | null } {
  const rawEmail = keys.email ? String(form.get(keys.email) ?? "") : "";
  const rawPhone = keys.phone ? String(form.get(keys.phone) ?? "") : "";
  const problem = emailProblem(rawEmail) ?? phoneProblem(rawPhone);
  return { email: normalizeEmail(rawEmail) || null, phone: normalizePhone(rawPhone), problem };
}
