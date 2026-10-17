"use client";

import { useState, type ReactNode } from "react";
import { UserPlus, Users, X } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import { buttonClass } from "@/components/ui/styles";

/** Inside a department: add a new user to it, or attach an existing one; each opens its form below. */
export function GroupActions({ name, newUser, existing, extra }: { name: string; newUser?: ReactNode; existing?: ReactNode; extra?: ReactNode }) {
  const [open, setOpen] = useState<"new" | "existing" | null>(null);
  const toggle = (w: "new" | "existing") => setOpen((o) => (o === w ? null : w));
  return (
    <div className="border-t border-rule bg-paper">
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        {newUser && (
          <button type="button" aria-expanded={open === "new"} onClick={() => toggle("new")} className={buttonClass("primary", "px-3 py-1.5 text-xs")}>
            {open === "new" ? <X size={14} aria-hidden="true" /> : <UserPlus size={14} aria-hidden="true" />}
            إضافة مستخدم
          </button>
        )}
        {existing && (
          <button type="button" aria-expanded={open === "existing"} onClick={() => toggle("existing")} className={buttonClass("secondary", "px-3 py-1.5 text-xs")}>
            {open === "existing" ? <X size={14} aria-hidden="true" /> : <Users size={14} aria-hidden="true" />}
            ضمّ مستخدم موجود
          </button>
        )}
        <span className="ms-auto flex gap-2">{extra}</span>
      </div>
      {newUser && (
        <Collapse show={open === "new"}>
          <div className="border-t border-rule bg-surface p-5">
            <h3 className="mb-4 font-display text-base font-bold">مستخدم جديد في {name}</h3>
            {newUser}
          </div>
        </Collapse>
      )}
      {existing && (
        <Collapse show={open === "existing"}>
          <div className="border-t border-rule bg-surface p-5">{existing}</div>
        </Collapse>
      )}
    </div>
  );
}
