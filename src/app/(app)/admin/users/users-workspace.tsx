"use client";

import { useState } from "react";
import clsx from "clsx";
import { DepartmentBlock, type DepartmentGroup, type Rights } from "./department-groups";
import type { RoleOption, UserItem } from "./page";
import { UserPanel } from "./user-panel";

/** Departments as folds with a compact users table each; editing a user opens the side panel beside them. */
export function UsersWorkspace({ groups, departments, committees, users, roles, rights, open, showLoose, activeUsers }: { groups: DepartmentGroup[]; departments: { id: string; name: string }[]; committees: { id: string; name: string }[]; users: UserItem[]; roles: RoleOption[]; rights: Rights; open: boolean; showLoose: boolean; activeUsers: { id: string; full_name: string; email: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const user = users.find((u) => u.id === selected) ?? null;
  const byId = new Map(users.map((u) => [u.id, u]));
  const placed = new Set(groups.flatMap((g) => g.userIds));
  const loose = users.filter((u) => !placed.has(u.id));
  const edit = (id: string) => {
    setSelected(id);
    // On a phone the panel sits above the list.
    if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => document.getElementById("user-panel-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className={clsx("grid items-start gap-4", user && "lg:grid-cols-[22rem_minmax(0,1fr)]")}>
      {user && (
        <div id="user-panel-anchor" className="scroll-mt-4">
          <UserPanel key={user.id} user={user} roles={roles} departments={departments} committees={committees} isSelf={user.id === rights.viewerId} canEdit={rights.canEdit} canManage={rights.canManage} canDelete={rights.canDelete} onClose={() => setSelected(null)} />
        </div>
      )}
      <div className="motion-stagger flex min-w-0 flex-col gap-3">
        {groups.map((g) => {
          const members = g.userIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
          return <DepartmentBlock key={g.id} group={g} users={members} roles={roles} rights={rights} initiallyOpen={open && members.length > 0} selectedId={selected} onEdit={edit} activeUsers={activeUsers} />;
        })}
        {showLoose && (loose.length > 0 || rights.canManage) && <DepartmentBlock users={loose} roles={roles} rights={rights} initiallyOpen={open || groups.length === 0} selectedId={selected} onEdit={edit} activeUsers={activeUsers} />}
      </div>
    </div>
  );
}
