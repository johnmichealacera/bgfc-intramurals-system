"use client";

import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export type ScoreDraft = { id: string; name: string; score: number };

export function CorrectScoreDialog({
  teams,
  pending,
  trigger,
  onSubmit,
}: {
  teams: ScoreDraft[];
  pending?: boolean;
  trigger: ReactElement;
  onSubmit: (scores: ScoreDraft[], reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [drafts, setDrafts] = useState(teams);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDrafts(teams);
          setReason("");
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct finished scores</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Change the final score and write why. Tabulators cannot do this.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {drafts.map((team) => (
              <div key={team.id} className="space-y-2">
                <Label htmlFor={`score-${team.id}`}>{team.name}</Label>
                <Input
                  id={`score-${team.id}`}
                  type="number"
                  min={0}
                  max={999}
                  value={team.score}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((row) =>
                        row.id === team.id ? { ...row, score: Math.max(0, Number(e.target.value) || 0) } : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="score-correction-reason">Reason</Label>
            <Textarea
              id="score-correction-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Officials confirmed the last basket was counted twice..."
            />
            {reason.trim().length > 0 && reason.trim().length < 8 && (
              <p className="text-xs text-destructive">Write at least 8 characters.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || reason.trim().length < 8}
            onClick={() => {
              onSubmit(drafts, reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            {pending ? "Saving..." : "Save correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
