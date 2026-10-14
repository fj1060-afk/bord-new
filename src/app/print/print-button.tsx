"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass()}>
      <Printer size={16} aria-hidden="true" /> طباعة / حفظ PDF
    </button>
  );
}
