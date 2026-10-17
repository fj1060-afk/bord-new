// The site's password policy, in one place: tighten it here and every form
// (creating a user, setting a password, resetting one) follows. During
// testing it only asks for a minimum length; the stricter rules are ready
// and switched off.

export const PASSWORD_POLICY = {
  minLength: 6,
  requireUpper: false,
  requireLower: false,
  requireDigit: false,
  requireSymbol: false,
  /** Reject passwords that contain the person's name or email. */
  avoidPersonal: false,
};

export type PasswordRule = { id: string; label: string; ok: boolean };

/** Each active rule and whether the password meets it. */
export function passwordRules(password: string, who: { name?: string; email?: string } = {}, policy = PASSWORD_POLICY): PasswordRule[] {
  const rules: PasswordRule[] = [{ id: "length", label: `${policy.minLength} أحرف على الأقل`, ok: password.length >= policy.minLength }];
  if (policy.requireUpper) rules.push({ id: "upper", label: "حرف إنجليزي كبير", ok: /[A-Z]/.test(password) });
  if (policy.requireLower) rules.push({ id: "lower", label: "حرف إنجليزي صغير", ok: /[a-z]/.test(password) });
  if (policy.requireDigit) rules.push({ id: "digit", label: "رقم", ok: /\d/.test(password) });
  if (policy.requireSymbol) rules.push({ id: "symbol", label: "رمز مثل ! أو #", ok: /[^A-Za-z0-9\s]/.test(password) });
  if (policy.avoidPersonal) {
    const lower = password.toLowerCase();
    const parts = [...(who.name ?? "").split(/\s+/), (who.email ?? "").split("@")[0]].filter((p) => p.length >= 3).map((p) => p.toLowerCase());
    rules.push({ id: "personal", label: "لا تحتوي الاسم أو البريد", ok: !parts.some((p) => lower.includes(p)) });
  }
  return rules;
}

/** The first rule a password breaks, as a message, or null when it passes. */
export function passwordProblem(password: string, who?: { name?: string; email?: string }, policy = PASSWORD_POLICY): string | null {
  const broken = passwordRules(password, who, policy).filter((r) => !r.ok);
  return broken.length ? `كلمة المرور يجب أن تحقق: ${broken.map((r) => r.label).join("، ")}.` : null;
}
