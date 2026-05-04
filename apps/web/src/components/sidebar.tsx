import Link from "next/link";
import { BarChart3, Bell, BookOpenCheck, Boxes, ClipboardList, Cog, ListFilter, Store, TerminalSquare } from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/rules", label: "Rules", icon: ListFilter },
  { href: "/events", label: "Events", icon: Bell },
  { href: "/settings", label: "Settings", icon: Cog },
  { href: "/logs", label: "Logs", icon: TerminalSquare }
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-border bg-card/80 p-4 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpenCheck size={20} aria-hidden />
        </div>
        <div>
          <div className="font-semibold">TCG Monitor</div>
          <div className="text-xs text-muted-foreground">Purchase assist only</div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <item.icon size={16} aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
