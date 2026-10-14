import { BrandSeal } from "./brand-seal";
import { SidebarNav } from "./sidebar-nav";

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-3">
      <BrandSeal />
      <div className="leading-tight">
        <p className="font-display text-xl font-bold text-white">مجلس</p>
        <p className="text-xs text-sidebar-muted">حوكمة المجالس واللجان</p>
      </div>
    </div>
  );
}

/** Fixed sidebar for wide screens; the mobile drawer reuses the same parts. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-sidebar px-3 py-6 lg:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}
