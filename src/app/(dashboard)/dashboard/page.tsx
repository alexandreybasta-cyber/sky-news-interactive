import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, ArrowLeftRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === "MANAGER";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's shifts
  const todayShifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow,
      },
      type: { not: "DAY_OFF" },
    },
    include: { user: true },
    orderBy: { type: "asc" },
  });

  // Upcoming stories
  const upcomingStories = await prisma.story.findMany({
    where: {
      status: { in: ["PLANNED", "IN_PROGRESS"] },
      deadline: { gte: today },
    },
    include: { assignee: true },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  // Pending requests count (for managers)
  const pendingRequestsCount = isManager
    ? await prisma.swapRequest.count({ where: { status: "PENDING" } })
    : 0;

  // User's next shift (for employees)
  const nextShift = !isManager
    ? await prisma.shift.findFirst({
        where: {
          userId: session?.user?.id,
          date: { gte: today },
          type: { not: "DAY_OFF" },
        },
        orderBy: { date: "asc" },
      })
    : null;

  const shiftTypeColors: Record<string, string> = {
    MORNING: "bg-amber-100 text-amber-800",
    AFTERNOON: "bg-blue-100 text-blue-800",
    NIGHT: "bg-indigo-100 text-indigo-800",
    DAY_OFF: "bg-gray-100 text-gray-600",
  };

  const storyStatusColors: Record<string, string> = {
    PLANNED: "bg-gray-100 text-gray-700",
    IN_PROGRESS: "bg-orange-100 text-orange-700",
    AIRED: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card className="border-l-4 border-l-orange-500 shadow-sm">
        <CardContent className="py-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(" ")[0]}
          </h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Shifts */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-5 w-5 text-orange-500" />
              Today&apos;s Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayShifts.length > 0 ? (
              <div className="space-y-3">
                {todayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {shift.user.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={shiftTypeColors[shift.type]}
                    >
                      {shift.type.charAt(0) + shift.type.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shifts scheduled today</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Stories */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-5 w-5 text-orange-500" />
              Upcoming Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingStories.length > 0 ? (
              <div className="space-y-3">
                {upcomingStories.map((story) => (
                  <div
                    key={story.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {story.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {story.deadline
                          ? new Date(story.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "No deadline"}
                        {story.assignee && ` • ${story.assignee.name}`}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={storyStatusColors[story.status]}
                    >
                      {story.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming stories</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests (Managers only) */}
        {isManager && (
          <Card className="shadow-sm border-l-4 border-l-orange-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ArrowLeftRight className="h-5 w-5 text-orange-500" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center">
                  <span className="text-2xl font-bold text-orange-600">
                    {pendingRequestsCount}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {pendingRequestsCount === 0
                      ? "All caught up!"
                      : `${pendingRequestsCount} request${pendingRequestsCount > 1 ? "s" : ""} awaiting review`}
                  </p>
                  <p className="text-xs text-gray-400">Swap requests from team</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Next Shift (Employees only) */}
        {!isManager && (
          <Card className="shadow-sm border-l-4 border-l-orange-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-5 w-5 text-orange-500" />
                My Next Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextShift ? (
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(nextShift.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <Badge
                      variant="secondary"
                      className={shiftTypeColors[nextShift.type]}
                    >
                      {nextShift.type.charAt(0) +
                        nextShift.type.slice(1).toLowerCase()}{" "}
                      Shift
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming shifts</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
