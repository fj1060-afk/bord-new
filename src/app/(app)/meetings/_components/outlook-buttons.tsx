"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/styles";
import { mailto } from "@/lib/outlook";

/**
 * Opens a ready message in the secretary's mail app (Outlook). When the text
 * is too long for a mail link, it is copied to the clipboard to paste.
 */
export function MailButton({ to, subject, body, label, variant = "secondary", emptyNote = "لا يوجد بريد إلكتروني؛ أضفه في ملفه." }: { to: string[]; subject: string; body: string; label: string; variant?: "primary" | "secondary"; /** Shown when there is nobody to write to; null when the caller explains it. */ emptyNote?: string | null }) {
  const [copied, setCopied] = useState(false);
  const link = mailto({ to, subject, body });
  const open = async () => {
    if (!link.fits) {
      try {
        await navigator.clipboard.writeText(body);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
    window.location.href = link.href;
  };
  return (
    <span className="flex flex-col gap-1">
      <button type="button" onClick={open} disabled={!to.length} className={buttonClass(variant, "w-fit gap-2")}>
        <Mail size={16} aria-hidden="true" /> {label}
      </button>
      {!to.length && emptyNote && <span className="text-xs text-danger">{emptyNote}</span>}
      {copied && <span className="text-xs text-brass">نُسخ نص الرسالة لطوله؛ الصقه في Outlook.</span>}
    </span>
  );
}
