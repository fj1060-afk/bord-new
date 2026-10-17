"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Building2, UserPlus, X } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import { buttonClass } from "@/components/ui/styles";

/** The page toolbar: search on one side, the two add buttons on the other; each opens its form below, one at a time. */
export function AddPanels({ search, userForm, departmentForm }: { search: ReactNode; userForm?: ReactNode; departmentForm?: ReactNode }) {
  const [open, setOpen] = useState<"user" | "department" | null>(null);
  const toggle = (which: "user" | "department") => setOpen((o) => (o === which ? null : which));
  return (
    <section className="mb-6 rounded-lg border border-rule bg-surface">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-0 flex-1 basis-72">{search}</div>
        <div className="flex gap-2">
          {departmentForm && (
            <button type="button" aria-expanded={open === "department"} onClick={() => toggle("department")} className={buttonClass("secondary")}>
              {open === "department" ? <X size={16} aria-hidden="true" /> : <Building2 size={16} aria-hidden="true" />}
              إضافة إدارة
            </button>
          )}
          {userForm && (
            <button type="button" aria-expanded={open === "user"} onClick={() => toggle("user")} className={buttonClass("primary")}>
              {open === "user" ? <X size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
              إضافة مستخدم
            </button>
          )}
        </div>
      </div>
      {departmentForm && (
        <Collapse show={open === "department"}>
          <div className={clsx("border-t border-rule p-5")}>
            <h2 className="mb-4 font-display text-lg font-bold">إدارة جديدة</h2>
            {departmentForm}
          </div>
        </Collapse>
      )}
      {userForm && (
        <Collapse show={open === "user"}>
          <div className="border-t border-rule p-5">
            <h2 className="mb-4 font-display text-lg font-bold">مستخدم جديد</h2>
            {userForm}
          </div>
        </Collapse>
      )}
    </section>
  );
}
