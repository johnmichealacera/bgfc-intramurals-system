"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Participant, TeamDetail } from "@/lib/types";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  course: z.string().min(1, "Course is required"),
  yearLevel: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]),
});
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { fullName: "", course: "", yearLevel: "", gender: "UNSPECIFIED" };

const GENDER_ITEMS = { UNSPECIFIED: "Not specified", MALE: "Male", FEMALE: "Female" };
const genderLabels: Record<string, string> = { MALE: "Male", FEMALE: "Female" };

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => apiFetch<TeamDetail>(`/api/teams/${id}`),
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<Participant>(`/api/participants`, {
        method: "POST",
        body: JSON.stringify({
          ...values,
          seasonId: team!.seasonId,
          teamId: id,
          gender: values.gender === "UNSPECIFIED" ? undefined : values.gender,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", id] });
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
        body: JSON.stringify({ ...values, gender: values.gender === "UNSPECIFIED" ? null : values.gender }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", id] });
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
      queryClient.invalidateQueries({ queryKey: ["team", id] });
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

  if (isLoading || !team) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={team.name}
        description={team.season.name}
        actions={
          <span className="size-6 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: team.colorHex }} />
        }
      />

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Participants</CardTitle>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEditingParticipant(null);
            }}
          >
            <DialogTrigger render={<Button className="gap-2" onClick={openCreateDialog} />}>
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
                      items={GENDER_ITEMS}
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
                <DialogFooter>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingParticipant ? "Save Changes" : "Add Participant"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {team.participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Users className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No participants yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add the students competing under this team.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Year Level</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.participants.map((participant) => (
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
                          description="This removes the participant from the team roster."
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
