"use client";

import { Collapse } from "@/components/ui/collapse";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/form";

/** Choose an existing person, or enter a new one (sent as new_* fields). */
export function PersonPicker({ people }: { people: { id: string; full_name: string }[] }) {
  const [choice, setChoice] = useState(people.length ? "" : "new");

  return (
    <div className="flex flex-col gap-3">
      <Field label="الشخص">
        <select name="person_id" value={choice} onChange={(e) => setChoice(e.target.value)} required className={inputClass}>
          <option value="" disabled>
            اختر من القائمة
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
          <option value="new">+ شخص جديد</option>
        </select>
      </Field>
      <Collapse show={choice === "new"}>
        {choice === "new" && (
          <div className="grid gap-3 rounded-md border border-dashed border-rule p-3 sm:grid-cols-3">
            <Field label="الاسم الكامل">
              <input name="new_full_name" required className={inputClass} />
            </Field>
            <Field label="البريد الإلكتروني">
              <input name="new_email" type="email" dir="ltr" className={inputClass} />
            </Field>
            <Field label="الجوال">
              <input name="new_phone" type="tel" dir="ltr" className={inputClass} />
            </Field>
          </div>
        )}
      </Collapse>
    </div>
  );
}
