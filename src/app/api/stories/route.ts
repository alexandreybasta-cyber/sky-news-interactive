import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/stories?status=X&assignee=X&search=X
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const assignee = searchParams.get("assignee");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    where.status = status;
  }
  if (assignee && assignee !== "ALL") {
    where.assignedTo = assignee;
  }
  if (search) {
    where.title = { contains: search };
  }

  const stories = await prisma.story.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
  });

  return NextResponse.json(stories);
}

// POST /api/stories - create story (manager only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, assignedTo, deadline } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const story = await prisma.story.create({
    data: {
      title,
      description: description || null,
      assignedTo: assignedTo || null,
      deadline: deadline ? new Date(deadline) : null,
      createdBy: session.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(story);
}
