export const LIBRARY_CATEGORIES = {
  policy: "سياسة",
  charter: "لائحة أو ميثاق",
  regulation: "نظام",
  report: "تقرير",
  other: "أخرى",
} as const;
export type LibraryCategory = keyof typeof LIBRARY_CATEGORIES;

/** "1.2 MB" / "340 KB" with Latin digits. */
export function fileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
