"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppUser } from "@/lib/types";

const NONE = "__none__";

export function GameTabulatorSelect({
  assigned,
  users,
  pending,
  onAssign,
}: {
  assigned?: { id: string; name: string } | null;
  users: AppUser[];
  pending?: boolean;
  onAssign: (userId: string | null) => void;
}) {
  const tabulators = users.filter((user) => user.role === "TABULATOR" && user.isActive);
  return (
    <Select
      value={assigned?.id ?? NONE}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        onAssign(value === NONE ? null : value);
      }}
      items={{ [NONE]: "Unassigned", ...Object.fromEntries(tabulators.map((user) => [user.id, user.name])) }}
    >
      <SelectTrigger className="h-8 w-44" disabled={pending}>
        <SelectValue placeholder="Assign tabulator" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Unassigned</SelectItem>
        {tabulators.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
