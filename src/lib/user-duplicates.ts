// A new user may not share a name, email or mobile number with an existing
// one. Names are compared loosely (hamza forms, taa marbuta, spacing) and
// numbers in their saved international form, so typing differences don't hide
// a duplicate.

import { normalizeEmail, normalizePhone } from "./contact-rules";
import { fold } from "./fold";

export type ExistingUser = { id: string; full_name: string | null; email: string | null; phone: string | null };
export type Duplicate = { field: "name" | "email" | "phone"; message: string };

const nameKey = (n: string | null | undefined) => fold(n ?? "").replace(/\s+/g, " ").trim();

/** The fields that clash with an existing user (optionally ignoring one, when editing). */
export function duplicateFields(candidate: { name?: string; email?: string; phone?: string }, existing: ExistingUser[], ignoreId?: string): Duplicate[] {
  const others = existing.filter((u) => u.id !== ignoreId);
  const out: Duplicate[] = [];
  const email = normalizeEmail(candidate.email ?? "");
  const phone = candidate.phone ? normalizePhone(candidate.phone) : null;
  const name = nameKey(candidate.name);
  const hit = (pred: (u: ExistingUser) => boolean) => others.find(pred);
  const e = email && hit((u) => normalizeEmail(u.email ?? "") === email);
  if (e) out.push({ field: "email", message: `البريد ${email} مسجّل باسم «${e.full_name ?? "مستخدم"}».` });
  const p = phone && hit((u) => !!u.phone && normalizePhone(u.phone) === phone);
  if (p) out.push({ field: "phone", message: `رقم الجوال مسجّل باسم «${p.full_name ?? "مستخدم"}».` });
  const n = name && hit((u) => nameKey(u.full_name) === name);
  if (n) out.push({ field: "name", message: `يوجد مستخدم بالاسم «${n.full_name}» (${n.email ?? "بلا بريد"}).` });
  return out;
}
