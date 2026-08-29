"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { AppLogo } from "@/components/app-logo";
import type { AppRole } from "@/lib/auth";

export function MobileNav({
  role,
  displayName,
  initials,
}: {
  role: AppRole;
  displayName: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 border-r border-border bg-card px-4 py-6 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppLogo className="size-8 rounded-lg" />
            <p className="text-sm font-semibold tracking-tight">BGFC Intramurals</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-teal-500/20 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {role.toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        <SidebarNav role={role} />

        <div className="mt-auto">
          <SignOutButton />
        </div>
      </div>
    </>
  );
}
