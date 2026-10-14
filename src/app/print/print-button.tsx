"use client";

import { useEffect } from "react";
import { Download, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

/** Prints the page; "PDF" names the file first (browsers use the title as the PDF file name). */
function run(mode: "print" | "pdf", fileName: string) {
  const title = document.title;
  if (mode === "pdf") document.title = fileName;
  document.fonts.ready.then(() => {
    window.print();
    document.title = title;
  });
}

export function PrintButton({ fileName = "document" }: { fileName?: string }) {
  // Links from the meeting page open the preview with ?do=print or ?do=pdf.
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("do");
    if (mode === "print" || mode === "pdf") run(mode, fileName);
  }, [fileName]);

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => run("print", fileName)} className={buttonClass("secondary")}>
        <Printer size={16} aria-hidden="true" /> طباعة
      </button>
      <button type="button" onClick={() => run("pdf", fileName)} className={buttonClass()}>
        <Download size={16} aria-hidden="true" /> تحميل PDF
      </button>
    </div>
  );
}
