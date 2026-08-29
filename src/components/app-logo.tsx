import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static, self-authored SVG; no benefit from next/image optimization here
  return <img src="/logo.svg" alt="BGFC Intramurals" className={cn("size-8 shrink-0", className)} />;
}
