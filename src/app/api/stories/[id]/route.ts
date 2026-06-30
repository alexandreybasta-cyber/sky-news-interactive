import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/stories/[id] - update story
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const isManager = session.user.role === "MANAGER";
  const isAssignee = story.assignedTo === session.user.id;

  // Employees can only update status of their assigned stories
  if (!isManager) {
    if (!isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Employee can only change status
    if (Object.keys(body).some((key) => key !== "status")) {
      return NextResponse.json(
        { error: "Employees can only update status" },
        { status: 403 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo || null;
  if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;

  const updated = await prisma.story.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/stories/[id] - delete story (manager only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  await prisma.story.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
