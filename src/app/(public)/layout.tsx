import { PublicSiteHeader } from "@/components/public/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-1/4 bottom-0 h-[480px] w-[480px] rounded-full bg-teal-500/8 blur-3xl" aria-hidden />

      <PublicSiteHeader />

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
