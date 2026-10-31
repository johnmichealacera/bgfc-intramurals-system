import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { assertMatchAccess } from "@/lib/tabulator";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { advanceBracketWinner } from "@/lib/bracket";

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

const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  winnerTeam: true,
  sportEvent: true,
  resumeRequestedBy: { select: { id: true, name: true } },
  resumeApprovedBy: { select: { id: true, name: true } },
  controlRequestedBy: { select: { id: true, name: true } },
  controlApprovedBy: { select: { id: true, name: true } },
} as const;

const clearResume = {
  resumeRequestedAt: null,
  resumeApprovedAt: null,
  resumeRequestedByUserId: null,
  resumeApprovedByUserId: null,
  resumeRequestReason: null,
};

const clearControl = {
  controlRequestedAt: null,
  controlApprovedAt: null,
  controlRequestedByUserId: null,
  controlApprovedByUserId: null,
  controlRequestReason: null,
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { action, reason = "" } = actionSchema.parse(await req.json());

    const match = await db.match.findUniqueOrThrow({ where: { id } });
    await assertMatchAccess(session, match.id);
    const userId = session!.user.id;
    const role = session!.user.role;

    if (action === "START") {
      if (match.status === "SCHEDULED" && role === "TABULATOR" && !match.controlApprovedAt) {
        return NextResponse.json(
          { error: "Request admin approval to control this live game first." },
          { status: 409 },
        );
      }
      if (match.status === "POSTPONED" && role === "TABULATOR" && !match.resumeApprovedAt) {
        return NextResponse.json(
          { error: "An admin must approve this resume before you can start the match." },
          { status: 409 },
        );
      }

      const result = await db.match.updateMany({
        where: { id, status: { in: ["SCHEDULED", "POSTPONED"] } },
        data: { status: "LIVE", updatedByUserId: userId, ...clearResume, ...clearControl },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Only scheduled or postponed matches can be started." }, { status: 409 });
      }
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      return NextResponse.json(fresh);
    }

    if (action === "POSTPONE") {
      const postponeReason = reason.trim();
      if (postponeReason.length < 8) {
        return NextResponse.json({ error: "Write a reason for postponing this game (at least 8 characters)." }, { status: 400 });
      }
      const result = await db.match.updateMany({
        where: { id, status: { in: ["SCHEDULED", "LIVE"] } },
        data: { status: "POSTPONED", updatedByUserId: userId, postponeReason, ...clearResume, ...clearControl },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Only scheduled or live matches can be postponed." }, { status: 409 });
      }
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      return NextResponse.json(fresh);
    }

    if (action === "REQUEST_RESUME") {
      assertRole(session, ["TABULATOR"]);
      const letter = reason.trim();
      if (letter.length < 15) {
        return NextResponse.json({ error: "Write a resume letter (at least 15 characters) before sending the request." }, { status: 400 });
      }
      if (match.status !== "POSTPONED") {
        return NextResponse.json({ error: "Only postponed matches can request a resume." }, { status: 409 });
      }
      if (match.resumeApprovedAt) {
        const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
        return NextResponse.json(fresh);
      }
      const updated = await db.match.update({
        where: { id },
        data: {
          resumeRequestedAt: new Date(),
          resumeRequestedByUserId: userId,
          resumeApprovedAt: null,
          resumeApprovedByUserId: null,
          resumeRequestReason: letter,
        },
        include: matchInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "APPROVE_RESUME") {
      assertRole(session, ["ADMIN"]);
      if (match.status !== "POSTPONED") {
        return NextResponse.json({ error: "Only postponed matches can be approved to resume." }, { status: 409 });
      }
      if (!match.resumeRequestedAt) {
        return NextResponse.json({ error: "No resume request is pending for this match." }, { status: 409 });
      }
      const updated = await db.match.update({
        where: { id },
        data: { resumeApprovedAt: new Date(), resumeApprovedByUserId: userId },
        include: matchInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "REJECT_RESUME") {
      assertRole(session, ["ADMIN"]);
      if (match.status !== "POSTPONED") {
        return NextResponse.json({ error: "Only postponed matches can have a resume request rejected." }, { status: 409 });
      }
      const updated = await db.match.update({
        where: { id },
        data: clearResume,
        include: matchInclude,
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
      if (match.status !== "SCHEDULED") {
        return NextResponse.json({ error: "Only scheduled matches can request live control." }, { status: 409 });
      }
      if (match.controlApprovedAt) {
        const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
        return NextResponse.json(fresh);
      }
      const updated = await db.match.update({
        where: { id },
        data: {
          controlRequestedAt: new Date(),
          controlRequestedByUserId: userId,
          controlApprovedAt: null,
          controlApprovedByUserId: null,
          controlRequestReason: letter,
        },
        include: matchInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "APPROVE_CONTROL") {
      assertRole(session, ["ADMIN"]);
      if (match.status !== "SCHEDULED") {
        return NextResponse.json({ error: "Only scheduled matches can be approved for live control." }, { status: 409 });
      }
      if (!match.controlRequestedAt) {
        return NextResponse.json({ error: "No control request is pending for this match." }, { status: 409 });
      }
      const updated = await db.match.update({
        where: { id },
        data: { controlApprovedAt: new Date(), controlApprovedByUserId: userId },
        include: matchInclude,
      });
      return NextResponse.json(updated);
    }

    if (action === "REJECT_CONTROL") {
      assertRole(session, ["ADMIN"]);
      if (match.status !== "SCHEDULED") {
        return NextResponse.json({ error: "Only scheduled matches can have a control request rejected." }, { status: 409 });
      }
      const updated = await db.match.update({
        where: { id },
        data: clearControl,
        include: matchInclude,
      });
      return NextResponse.json(updated);
    }

    const finished = await db.$transaction(async (tx) => {
      const current = await tx.match.findUniqueOrThrow({ where: { id } });
      if (current.status !== "LIVE") {
        return tx.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      }

      const winnerTeamId =
        current.homeScore === current.awayScore
          ? null
          : current.homeScore > current.awayScore
            ? current.homeTeamId
            : current.awayTeamId;

      const updated = await tx.match.update({
        where: { id },
        data: { status: "FINISHED", winnerTeamId, updatedByUserId: userId, ...clearResume },
        include: matchInclude,
      });
      await advanceBracketWinner(tx, id, winnerTeamId);
      return updated;
    });

    return NextResponse.json(finished);
  } catch (error) {
    return apiError(error);
  }
}
