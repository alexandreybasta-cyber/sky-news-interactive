import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.availability.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.story.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();

  // Create Manager
  const managerPassword = await bcrypt.hash("admin123", 10);
  const manager = await prisma.user.create({
    data: {
      name: "Ahmed Al-Rashid",
      email: "ahmed@skynews.ae",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Create Employees
  const staffPassword = await bcrypt.hash("staff123", 10);

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: "Fatima Al-Zahra",
        email: "fatima@skynews.ae",
        password: staffPassword,
        role: "EMPLOYEE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Omar Hassan",
        email: "omar@skynews.ae",
        password: staffPassword,
        role: "EMPLOYEE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Layla Ibrahim",
        email: "layla@skynews.ae",
        password: staffPassword,
        role: "EMPLOYEE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Hassan Mohammed",
        email: "hassan@skynews.ae",
        password: staffPassword,
        role: "EMPLOYEE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Noura Al-Sayed",
        email: "noura@skynews.ae",
        password: staffPassword,
        role: "EMPLOYEE",
      },
    }),
  ]);

  // Create some sample shifts for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekNumber = Math.ceil(
    (today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  await Promise.all([
    prisma.shift.create({
      data: {
        userId: employees[0].id,
        date: today,
        type: "MORNING",
        weekNumber,
        createdBy: manager.id,
      },
    }),
    prisma.shift.create({
      data: {
        userId: employees[1].id,
        date: today,
        type: "MORNING",
        weekNumber,
        createdBy: manager.id,
      },
    }),
    prisma.shift.create({
      data: {
        userId: employees[2].id,
        date: today,
        type: "AFTERNOON",
        weekNumber,
        createdBy: manager.id,
      },
    }),
    prisma.shift.create({
      data: {
        userId: employees[3].id,
        date: today,
        type: "NIGHT",
        weekNumber,
        createdBy: manager.id,
      },
    }),
    prisma.shift.create({
      data: {
        userId: employees[4].id,
        date: today,
        type: "DAY_OFF",
        weekNumber,
        createdBy: manager.id,
      },
    }),
  ]);

  // Create some sample stories
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  await Promise.all([
    prisma.story.create({
      data: {
        title: "Abu Dhabi Grand Prix Coverage",
        description: "Live coverage of the F1 Grand Prix weekend",
        status: "IN_PROGRESS",
        assignedTo: employees[0].id,
        deadline: tomorrow,
        createdBy: manager.id,
      },
    }),
    prisma.story.create({
      data: {
        title: "UAE National Day Special",
        description: "Special segment on UAE National Day celebrations",
        status: "PLANNED",
        assignedTo: employees[1].id,
        deadline: nextWeek,
        createdBy: manager.id,
      },
    }),
    prisma.story.create({
      data: {
        title: "Tech Innovation Summit Report",
        description: "Report on the upcoming tech summit in Abu Dhabi",
        status: "PLANNED",
        assignedTo: employees[2].id,
        deadline: nextWeek,
        createdBy: manager.id,
      },
    }),
  ]);

  console.log("Database seeded successfully!");
  console.log(`Manager: ${manager.email} (password: admin123)`);
  console.log(`Employees: ${employees.map((e) => e.email).join(", ")} (password: staff123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
