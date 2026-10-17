"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { passwordRules } from "@/lib/password";
import { inputWith } from "./styles";

/** A new-password input with show/hide and the site's rules ticked off as you type. */
export function PasswordField({ name = "password", required, who, placeholder }: { name?: string; required?: boolean; who?: { name?: string; email?: string }; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const rules = passwordRules(value, who);
  const input = useRef<HTMLInputElement>(null);
  // Clear with the form after a successful save (the input is controlled, so reset() alone would not).
  useEffect(() => {
    const form = input.current?.form;
    const clear = () => setValue("");
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <input
          ref={input}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          dir="ltr"
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className={inputWith("pe-10")}
        />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="motion-press absolute inset-y-0 end-1 my-auto grid size-8 place-items-center rounded text-ink-muted hover:text-ink">
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {(value || required) && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-live="polite">
          {rules.map((r) => (
            <li key={r.id} className={clsx("motion-colors inline-flex items-center gap-1", r.ok ? "text-primary" : "text-ink-muted")}>
              {r.ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
