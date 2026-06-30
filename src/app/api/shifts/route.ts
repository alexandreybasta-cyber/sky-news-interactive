import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/shifts?week=YYYY-WW
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week"); // format: YYYY-WW

  if (!week) {
    return NextResponse.json({ error: "week parameter required" }, { status: 400 });
  }

  const [yearStr, weekStr] = week.split("-W");
  const year = parseInt(yearStr);
  const weekNumber = parseInt(weekStr);

  // Calculate start of week (Monday) from ISO week number
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: monday,
        lt: sunday,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ date: "asc" }, { user: { name: "asc" } }],
  });

  // Get all employees
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Get availability for this week
  const availability = await prisma.availability.findMany({
    where: { weekNumber, year },
  });

  return NextResponse.json({
    shifts,
    employees,
    availability,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  });
}

// POST /api/shifts - create/update shift (manager only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, date, type, weekNumber } = body;

  if (!userId || !date || !type || !weekNumber) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const shiftDate = new Date(date);
  shiftDate.setHours(0, 0, 0, 0);

  // Upsert: if shift exists for this user+date, update it
  const existing = await prisma.shift.findFirst({
    where: {
      userId,
      date: shiftDate,
    },
  });

  let shift;
  if (existing) {
    shift = await prisma.shift.update({
      where: { id: existing.id },
      data: { type },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  } else {
    shift = await prisma.shift.create({
      data: {
        userId,
        date: shiftDate,
        type,
        weekNumber,
        createdBy: session.user.id,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  return NextResponse.json(shift);
}
