import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertEventAccess, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { clearControl, clearResume, ensureScheduleScores, scheduleInclude } from "@/lib/session-scoreboard";

const actionSchema = z.object({
  action: z.enum([
    "START",
    "FINISH",
    "POSTPONE",
    "REQUEST_RESUME",
    "APPROVE_RESUME",
    "REJECT_RESUME",
    "REQUEST_CONTROL",
    "APPROVE_CONTROL",
    "REJECT_CONTROL",
  ]),
  reason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { action, reason = "" } = actionSchema.parse(await req.json());

    const schedule = await db.eventSchedule.findUniqueOrThrow({ where: { id } });
    await assertEventAccess(session, schedule.sportEventId);
    const userId = session!.user.id;
    const role = session!.user.role;

    if (action === "START") {
      if (schedule.status === "SCHEDULED" && role === "TABULATOR" && !schedule.controlApprovedAt) {
        return NextResponse.json(
          { error: "Request admin approval to control this live game first." },
          { status: 409 },
        );
      }
      if (schedule.status === "POSTPONED" && role === "TABULATOR" && !schedule.resumeApprovedAt) {
        return NextResponse.json(
          { error: "An admin must approve this resume before you can start the session." },
          { status: 409 },
        );
      }

      const result = await db.eventSchedule.updateMany({
        where: { id, status: { in: ["SCHEDULED", "POSTPONED"] } },
        data: { status: "LIVE", updatedByUserId: userId, ...clearResume, ...clearControl },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Only scheduled or postponed sessions can be started." }, { status: 409 });
      }
      await ensureScheduleScores(id, schedule.sportEventId);
      const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
      return NextResponse.json(fresh);
    }

    if (action === "POSTPONE") {
      const postponeReason = reason.trim();
      if (postponeReason.length < 8) {
        return NextResponse.json({ error: "Write a reason for postponing this session (at least 8 characters)." }, { status: 400 });
      }
      const result = await db.eventSchedule.updateMany({
        where: { id, status: { in: ["SCHEDULED", "LIVE"] } },
        data: { status: "POSTPONED", updatedByUserId: userId, postponeReason, ...clearResume, ...clearControl },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Only scheduled or live sessions can be postponed." }, { status: 409 });
      }
      const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
      return NextResponse.json(fresh);
    }

    if (action === "REQUEST_RESUME") {
      assertRole(session, ["TABULATOR"]);
      const letter = reason.trim();
      if (letter.length < 15) {
        return NextResponse.json({ error: "Write a resume letter (at least 15 characters) before sending the request." }, { status: 400 });
      }
      if (schedule.status !== "POSTPONED") {
        return NextResponse.json({ error: "Only postponed sessions can request a resume." }, { status: 409 });
      }
      if (schedule.resumeApprovedAt) {
        const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
        return NextResponse.json(fresh);
      }
      const updated = await db.eventSchedule.update({
        where: { id },
        data: {
          resumeRequestedAt: new Date(),
          resumeRequestedByUserId: userId,
          resumeApprovedAt: null,
          resumeApprovedByUserId: null,
          resumeRequestReason: letter,
        },
        include: scheduleInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "APPROVE_RESUME") {
      assertRole(session, ["ADMIN"]);
      if (schedule.status !== "POSTPONED") {
        return NextResponse.json({ error: "Only postponed sessions can be approved to resume." }, { status: 409 });
      }
      if (!schedule.resumeRequestedAt) {
        return NextResponse.json({ error: "No resume request is pending for this session." }, { status: 409 });
      }
      const updated = await db.eventSchedule.update({
        where: { id },
        data: { resumeApprovedAt: new Date(), resumeApprovedByUserId: userId },
        include: scheduleInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "REJECT_RESUME") {
      assertRole(session, ["ADMIN"]);
      if (schedule.status !== "POSTPONED") {
        return NextResponse.json({ error: "Only postponed sessions can have a resume request rejected." }, { status: 409 });
      }
      const updated = await db.eventSchedule.update({
        where: { id },
        data: clearResume,
        include: scheduleInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "REQUEST_CONTROL") {
      assertRole(session, ["TABULATOR"]);
      const letter = reason.trim();
      if (letter.length < 15) {
        return NextResponse.json(
          { error: "Write a control letter (at least 15 characters) before sending the request." },
          { status: 400 },
        );
      }
      if (schedule.status !== "SCHEDULED") {
        return NextResponse.json({ error: "Only scheduled sessions can request live control." }, { status: 409 });
      }
      if (schedule.controlApprovedAt) {
        const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
        return NextResponse.json(fresh);
      }
      const updated = await db.eventSchedule.update({
        where: { id },
        data: {
          controlRequestedAt: new Date(),
          controlRequestedByUserId: userId,
          controlApprovedAt: null,
          controlApprovedByUserId: null,
          controlRequestReason: letter,
        },
        include: scheduleInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "APPROVE_CONTROL") {
      assertRole(session, ["ADMIN"]);
      if (schedule.status !== "SCHEDULED") {
        return NextResponse.json({ error: "Only scheduled sessions can be approved for live control." }, { status: 409 });
      }
      if (!schedule.controlRequestedAt) {
        return NextResponse.json({ error: "No control request is pending for this session." }, { status: 409 });
      }
      const updated = await db.eventSchedule.update({
        where: { id },
        data: { controlApprovedAt: new Date(), controlApprovedByUserId: userId },
        include: scheduleInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "REJECT_CONTROL") {
      assertRole(session, ["ADMIN"]);
      if (schedule.status !== "SCHEDULED") {
        return NextResponse.json({ error: "Only scheduled sessions can have a control request rejected." }, { status: 409 });
      }
      const updated = await db.eventSchedule.update({
        where: { id },
        data: clearControl,
        include: scheduleInclude,
      });
      return NextResponse.json(updated);
    }

    const result = await db.eventSchedule.updateMany({
      where: { id, status: "LIVE" },
      data: { status: "FINISHED", updatedByUserId: userId, ...clearResume, ...clearControl },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Only live sessions can be finished." }, { status: 409 });
    }
    const finished = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
    return NextResponse.json(finished);
  } catch (error) {
    return apiError(error);
  }
}
