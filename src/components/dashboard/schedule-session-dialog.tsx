"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";

const schema = z.object({
  title: z.string().optional(),
  scheduledAt: z.string().min(1, "Select a date and time"),
  venue: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ScheduleSessionDialog({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", scheduledAt: "", venue: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch(`/api/events/${eventId}/schedules`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Session scheduled");
      setOpen(false);
      form.reset({ title: "", scheduledAt: "", venue: "" });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to schedule session"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Add Session
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            This is a public schedule for the school — not a scoreboard match. Results are still finalized as
            placements on this event page.
          </p>
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" placeholder="Finals" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Date &amp; time</Label>
            <Input id="scheduledAt" type="datetime-local" {...form.register("scheduledAt")} />
            {form.formState.errors.scheduledAt && (
              <p className="text-sm text-destructive">{form.formState.errors.scheduledAt.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue (optional)</Label>
            <Input id="venue" placeholder="Multi-Purpose Hall" {...form.register("venue")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
