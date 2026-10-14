"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import { inputClass } from "./styles";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Stored values are sanitised HTML; older plain text becomes paragraphs. */
const toHtml = (v: string) => (/<\/?(p|br|b|strong|i|em|u|ul|ol|li)\b/i.test(v) ? v : v.split(/\n{2,}/).map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`).join(""));

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "غامق" },
  { cmd: "italic", icon: Italic, label: "مائل" },
  { cmd: "underline", icon: Underline, label: "تسطير" },
  { cmd: "insertUnorderedList", icon: List, label: "قائمة نقطية" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "قائمة مرقمة" },
];

/** A small rich-text editor; its HTML is posted in a hidden input and sanitised on the server. */
export function RichTextField({ name, defaultValue, dir = "rtl", lang = "ar", minHeight = 96, label }: { name: string; defaultValue?: string | null; dir?: "rtl" | "ltr"; lang?: string; minHeight?: number; label?: string }) {
  const editor = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editor.current) editor.current.innerHTML = toHtml(defaultValue ?? "");
    if (field.current) field.current.value = editor.current?.innerHTML ?? "";
  }, [defaultValue]);

  const sync = () => {
    if (field.current && editor.current) field.current.value = editor.current.innerHTML;
  };

  return (
    <div className={clsx(inputClass, "p-0")}>
      <div className="flex gap-0.5 border-b border-rule px-1 py-1" role="toolbar" aria-label={label ? `تنسيق ${label}` : "تنسيق النص"}>
        {TOOLS.map(({ cmd, icon: Icon, label: l }) => (
          <button
            key={cmd}
            type="button"
            title={l}
            aria-label={l}
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand(cmd);
              sync();
            }}
            className="rounded p-1.5 text-ink-muted hover:bg-primary-soft hover:text-primary"
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        dir={dir}
        lang={lang}
        spellCheck
        onInput={sync}
        onBlur={sync}
        className="rich-text px-3 py-2 text-sm outline-none"
        style={{ minHeight }}
      />
      <input ref={field} type="hidden" name={name} />
    </div>
  );
}

/** Optional English rich text, collapsed until it has a value. */
export function EnglishRichField({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  return (
    <details open={!!defaultValue} className="text-sm">
      <summary className="cursor-pointer text-xs text-ink-muted">English · للمستندات ثنائية اللغة</summary>
      <div className="mt-1">
        <RichTextField name={name} defaultValue={defaultValue} dir="ltr" lang="en" minHeight={72} label="English" />
      </div>
    </details>
  );
}
