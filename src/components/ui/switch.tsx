import type { InputHTMLAttributes, ReactNode } from "react";

/** One setting: its label and explanation, with an on/off switch at the line end (the left, the app being RTL). It submits like a checkbox. */
export function SwitchRow({ label, hint, children, ...input }: { label: string; hint?: ReactNode; children?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <label className="flex cursor-pointer items-start justify-between gap-4 has-[:disabled]:cursor-not-allowed">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{label}</span>
          {hint && <span className="text-xs leading-5 text-ink-muted">{hint}</span>}
        </span>
        <span className="relative mt-0.5 inline-flex shrink-0">
          <input type="checkbox" role="switch" className="peer sr-only" {...input} />
          <span aria-hidden className="h-6 w-11 rounded-full bg-rule transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
          <span aria-hidden className="absolute top-0.5 start-0.5 size-5 rounded-full bg-surface shadow transition-transform peer-checked:-translate-x-5" />
        </span>
      </label>
      {children}
    </div>
  );
}
