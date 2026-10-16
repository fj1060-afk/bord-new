/** Arabic text folded for matching: no diacritics or tatweel, one alef, ta marbuta as ha, alef maqsura as ya. */
export function fold(s: string) {
  return s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase();
}
