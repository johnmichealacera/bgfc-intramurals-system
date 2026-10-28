"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/standings", label: "Standings" },
  { href: "/medals", label: "Medals" },
  { href: "/schedule", label: "Schedule" },
  { href: "/rules", label: "Guidelines" },
];

export function PublicSiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
          <AppLogo className="size-7 rounded-md" />
          <p className="truncate text-sm font-semibold tracking-tight sm:text-base">BGFC Intramurals</p>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="ml-2 rounded-lg border border-primary/25 bg-background/80 px-3 py-1.5 font-medium shadow-sm transition-all hover:bg-primary/5"
          >
            Staff Sign In
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link
            href="/sign-in"
            className="rounded-lg border border-primary/25 bg-background/80 px-3 py-1.5 text-sm font-medium shadow-sm"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/70 bg-card/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  pathname === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
