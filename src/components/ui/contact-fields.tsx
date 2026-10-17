"use client";

import { useState, type InputHTMLAttributes } from "react";
import clsx from "clsx";
import { clampPhone, emailProblem, formatPhone, normalizePhone, phoneProblem, phoneShortBy } from "@/lib/contact-rules";
import { Collapse } from "./collapse";
import { inputClass } from "./styles";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onBlur" | "onChange" | "value"> & { name: string };

/**
 * An input checked against the site's rules when the person leaves it (not
 * on every key), with the reason shown under it; the browser also refuses to
 * submit while it is wrong.
 */
function RuledInput({ problemOf, note, clamp, ...props }: Props & { type: string; problemOf: (v: string) => string | null; note?: (v: string) => string | null; clamp?: (v: string) => string }) {
  const [value, setValue] = useState(String(props.defaultValue ?? ""));
  const [touched, setTouched] = useState(false);
  const problem = problemOf(value);
  const shown = touched ? problem : null;
  const hint = !shown && value && note ? note(value) : null;
  return (
    <span className="flex flex-col gap-1">
      <input
        {...props}
        defaultValue={undefined}
        value={value}
        dir="ltr"
        aria-invalid={!!shown || undefined}
        onChange={(e) => {
          const next = clamp ? clamp(e.target.value) : e.target.value;
          setValue(next);
          e.target.setCustomValidity(problemOf(next) ?? "");
        }}
        onBlur={(e) => {
          setTouched(true);
          e.target.setCustomValidity(problemOf(e.target.value) ?? "");
        }}
        onInvalid={() => setTouched(true)}
        className={clsx(inputClass, shown && "border-danger focus:border-danger", props.className)}
      />
      <Collapse show={!!shown || !!hint}>
        <span className={clsx("block text-xs", shown ? "text-danger" : "text-ink-muted")}>{shown ?? hint}</span>
      </Collapse>
    </span>
  );
}

export function EmailField(props: Props) {
  return <RuledInput type="email" autoComplete="email" inputMode="email" {...props} problemOf={emailProblem} />;
}

export function PhoneField(props: Props) {
  return (
    <RuledInput
      type="tel"
      autoComplete="tel"
      inputMode="tel"
      placeholder="05XXXXXXXX"
      {...props}
      problemOf={phoneProblem}
      clamp={clampPhone}
      note={(v) => {
        const short = phoneShortBy(v);
        if (short) return `باقي ${short === 1 ? "رقم واحد" : short === 2 ? "رقمان" : `${short} أرقام`}`;
        const n = normalizePhone(v);
        return n && n !== v.trim() ? `يُحفظ: ${formatPhone(n)}` : null;
      }}
    />
  );
}
