import { richHtml } from "@/lib/rich-text";

/** Renders stored rich text (sanitised again on the way out). */
export function RichText({ value, className, dir, lang }: { value: string | null | undefined; className?: string; dir?: "rtl" | "ltr"; lang?: string }) {
  const html = richHtml(value);
  if (!html) return null;
  return <div className={`rich-text ${className ?? ""}`} dir={dir} lang={lang} dangerouslySetInnerHTML={{ __html: html }} />;
}
