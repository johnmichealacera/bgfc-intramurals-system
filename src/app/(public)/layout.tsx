import Link from "next/link";
import { Trophy } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-1/4 bottom-0 h-[480px] w-[480px] rounded-full bg-teal-500/8 blur-3xl" aria-hidden />

      <header className="relative sticky top-0 z-30 border-b border-border/70 bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="size-6 text-primary" />
            <p className="text-sm font-semibold tracking-tight sm:text-base">BGFC Intramurals</p>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
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
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
