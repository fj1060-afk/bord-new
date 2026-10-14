import sanitizeHtml from "sanitize-html";

// Rich text from the editor is stored as a small, sanitised subset of HTML.
// Older plain-text values (with line breaks) still render.

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li"],
  allowedAttributes: {},
  transformTags: { div: "p", h1: "p", h2: "p", h3: "p" },
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isHtml = (s: string) => /<\/?(p|br|b|strong|i|em|u|ul|ol|li|div)\b/i.test(s);

/** Sanitised HTML for display; plain text becomes paragraphs and line breaks. */
export function richHtml(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  if (!isHtml(value)) return value.split(/\n{2,}/).map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`).join("");
  return sanitizeHtml(value, OPTIONS);
}

/** Sanitises editor output before saving; empty editors store null. */
export function cleanRich(value: FormDataEntryValue | null): string | null {
  const html = sanitizeHtml(String(value ?? ""), OPTIONS).trim();
  return plainText(html) ? html : null;
}

/** Text content, for checks such as "is this paragraph empty?". */
export function plainText(value: string | null | undefined): string {
  return (value ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}
