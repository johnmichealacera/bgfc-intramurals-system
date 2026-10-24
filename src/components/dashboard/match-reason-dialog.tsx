"use client";

import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function MatchReasonDialog({
  title,
  description,
  placeholder,
  confirmLabel,
  trigger,
  minLength,
  pending,
  onSubmit,
}: {
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
  trigger: ReactElement;
  minLength: number;
  pending?: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason("");
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          <Label htmlFor="match-reason">Letter / reason</Label>
          <Textarea
            id="match-reason"
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
          />
          {reason.trim().length > 0 && reason.trim().length < minLength && (
            <p className="text-xs text-destructive">Write at least {minLength} characters.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={pending || reason.trim().length < minLength}
            onClick={() => {
              onSubmit(reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            {pending ? "Sending..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
