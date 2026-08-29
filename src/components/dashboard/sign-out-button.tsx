"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
    >
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
