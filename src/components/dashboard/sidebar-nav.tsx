"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navConfig } from "@/lib/nav";
import type { AppRole } from "@/lib/auth";

export function SidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = navConfig.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={cn(
                "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:bg-accent/70",
                isActive
                  ? "bg-linear-to-r from-primary/12 to-primary/0 text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
              <Icon
                className={cn(
                  "size-[18px] shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
