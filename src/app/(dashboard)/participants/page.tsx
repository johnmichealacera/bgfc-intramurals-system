"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { Participant, Team } from "@/lib/types";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  course: z.string().min(1, "Course is required"),
  yearLevel: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]),
  teamId: z.string(),
});
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { fullName: "", course: "", yearLevel: "", gender: "UNSPECIFIED", teamId: "UNASSIGNED" };

const genderLabels: Record<string, string> = { MALE: "Male", FEMALE: "Female" };

export default function ParticipantsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [teamFilter, setTeamFilter] = useState("ALL");
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const { data: teams } = useQuery({
    queryKey: ["teams", seasonId],
    queryFn: () => apiFetch<Team[]>(`/api/teams?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const { data: participants, isLoading } = useQuery({
    queryKey: ["participants", seasonId],
    queryFn: () => apiFetch<Participant[]>(`/api/participants?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const teamItems = useMemo(
    () => ({ UNASSIGNED: "No team", ...Object.fromEntries((teams ?? []).map((t) => [t.id, t.name])) }),
    [teams],
  );

  const filteredParticipants = useMemo(() => {
    if (!participants) return [];
    if (teamFilter === "ALL") return participants;
    if (teamFilter === "UNASSIGNED") return participants.filter((p) => !p.teamId);
    return participants.filter((p) => p.teamId === teamFilter);
  }, [participants, teamFilter]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<Participant>("/api/participants", {
        method: "POST",
        body: JSON.stringify({
          fullName: values.fullName,
          course: values.course,
          yearLevel: values.yearLevel,
          gender: values.gender === "UNSPECIFIED" ? undefined : values.gender,
          seasonId,
          teamId: values.teamId === "UNASSIGNED" ? null : values.teamId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["teams", seasonId] });
      toast.success("Participant added");
      setOpen(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to add participant"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ participantId, ...values }: FormValues & { participantId: string }) =>
      apiFetch<Participant>(`/api/participants/${participantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: values.fullName,
          course: values.course,
          yearLevel: values.yearLevel,
          gender: values.gender === "UNSPECIFIED" ? null : values.gender,
          teamId: values.teamId === "UNASSIGNED" ? null : values.teamId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["teams", seasonId] });
      toast.success("Participant updated");
      setOpen(false);
      setEditingParticipant(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update participant"),
  });

  const deleteMutation = useMutation({
    mutationFn: (participantId: string) => apiFetch(`/api/participants/${participantId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["teams", seasonId] });
      toast.success("Participant removed");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to remove participant"),
  });

  function openCreateDialog() {
    setEditingParticipant(null);
    form.reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEditDialog(participant: Participant) {
    setEditingParticipant(participant);
    form.reset({
      fullName: participant.fullName,
      course: participant.course,
      yearLevel: participant.yearLevel ?? "",
      gender: participant.gender ?? "UNSPECIFIED",
      teamId: participant.teamId ?? "UNASSIGNED",
    });
    setOpen(true);
  }

  function handleSubmit(values: FormValues) {
    if (editingParticipant) {
      updateMutation.mutate({ participantId: editingParticipant.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const filterItems = { ALL: "All teams", UNASSIGNED: "Unassigned", ...Object.fromEntries((teams ?? []).map((t) => [t.id, t.name])) };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Participants"
        description="Manage every participant in the selected season, with or without a team."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={seasonId ?? ""} onValueChange={(value) => setSeasonId(value ?? undefined)} items={seasonItems}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={(value) => setTeamFilter(value ?? "ALL")} items={filterItems}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All teams</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {(teams ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) setEditingParticipant(null);
              }}
            >
              <DialogTrigger render={<Button className="gap-2" disabled={!seasonId} onClick={openCreateDialog} />}>
                <Plus className="size-4" />
                Add Participant
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingParticipant ? "Edit Participant" : "Add Participant"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" placeholder="Juan Dela Cruz" {...form.register("fullName")} />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Input id="course" placeholder="BS Information Technology" {...form.register("course")} />
                    {form.formState.errors.course && (
                      <p className="text-sm text-destructive">{form.formState.errors.course.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearLevel">Year level (optional)</Label>
                      <Input id="yearLevel" placeholder="3rd Year" {...form.register("yearLevel")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={form.watch("gender")}
                        onValueChange={(v) => form.setValue("gender", v as FormValues["gender"])}
                        items={{ UNSPECIFIED: "Not specified", MALE: "Male", FEMALE: "Female" }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNSPECIFIED">Not specified</SelectItem>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Team</Label>
                    <Select
                      value={form.watch("teamId")}
                      onValueChange={(v) => form.setValue("teamId", v ?? "UNASSIGNED")}
                      items={teamItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNASSIGNED">No team</SelectItem>
                        {(teams ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Leave as &quot;No team&quot; to add the participant now and assign them later.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : editingParticipant ? "Save Changes" : "Add Participant"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : !filteredParticipants.length ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <UserPlus className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No participants yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {seasonId ? "Add a participant to get started." : "Activate a season to begin adding participants."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Year Level</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{participant.course}</TableCell>
                    <TableCell className="text-muted-foreground">{participant.yearLevel ?? "—"}</TableCell>
                    <TableCell>
                      {participant.gender ? (
                        <Badge variant="outline" className="text-[10px]">
                          {genderLabels[participant.gender]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {participant.team ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: participant.team.colorHex }}
                          />
                          {participant.team.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(participant)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          title={`Remove ${participant.fullName}?`}
                          description="This permanently deletes the participant record."
                          pending={deleteMutation.isPending}
                          onConfirm={() => deleteMutation.mutate(participant.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
