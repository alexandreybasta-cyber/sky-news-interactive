"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Calendar, Users } from "lucide-react";

type Employee = { id: string; name: string; email: string };
type Shift = {
  id: string;
  userId: string;
  date: string;
  type: string;
  user: Employee;
};
type Availability = {
  id: string;
  userId: string;
  unavailableDates: string;
};

const SHIFT_TYPES = ["MORNING", "AFTERNOON", "NIGHT", "DAY_OFF"] as const;

const SHIFT_COLORS: Record<string, string> = {
  MORNING: "bg-orange-100 text-orange-700",
  AFTERNOON: "bg-blue-100 text-blue-700",
  NIGHT: "bg-purple-100 text-purple-700",
  DAY_OFF: "bg-gray-100 text-gray-500",
};

const SHIFT_LABELS: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  NIGHT: "Night",
  DAY_OFF: "Day Off",
};

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ShiftsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";

  const [currentWeek, setCurrentWeek] = useState(() => getISOWeek(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ userId: string; date: string } | null>(null);
  const [selectedShiftType, setSelectedShiftType] = useState<string>("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState<string>("");
  const [bulkShiftType, setBulkShiftType] = useState<string>("");

  const weekStr = `${currentWeek.year}-W${String(currentWeek.week).padStart(2, "0")}`;
  const monday = getMondayOfWeek(currentWeek.year, currentWeek.week);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?week=${weekStr}`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts);
        setEmployees(data.employees);
        setAvailability(data.availability);
      }
    } catch (err) {
      console.error("Failed to fetch shifts:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStr]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const navigateWeek = (direction: number) => {
    const newMonday = new Date(monday);
    newMonday.setDate(monday.getDate() + direction * 7);
    setCurrentWeek(getISOWeek(newMonday));
  };

  const getShiftForCell = (userId: string, date: Date): Shift | undefined => {
    const dateStr = date.toISOString().split("T")[0];
    return shifts.find((s) => {
      const shiftDate = new Date(s.date).toISOString().split("T")[0];
      return s.userId === userId && shiftDate === dateStr;
    });
  };

  const isUnavailable = (userId: string, date: Date): boolean => {
    const av = availability.find((a) => a.userId === userId);
    if (!av) return false;
    try {
      const dates: string[] = JSON.parse(av.unavailableDates);
      const dateStr = date.toISOString().split("T")[0];
      return dates.includes(dateStr);
    } catch {
      return false;
    }
  };

  const handleAssignShift = async () => {
    if (!selectedCell || !selectedShiftType) return;
    try {
      await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCell.userId,
          date: selectedCell.date,
          type: selectedShiftType,
          weekNumber: currentWeek.week,
        }),
      });
      setAssignDialogOpen(false);
      setSelectedCell(null);
      setSelectedShiftType("");
      fetchShifts();
    } catch (err) {
      console.error("Failed to assign shift:", err);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkDate || !bulkShiftType) return;
    try {
      const promises = employees.map((emp) =>
        fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: emp.id,
            date: bulkDate,
            type: bulkShiftType,
            weekNumber: currentWeek.week,
          }),
        })
      );
      await Promise.all(promises);
      setBulkDialogOpen(false);
      setBulkDate("");
      setBulkShiftType("");
      fetchShifts();
    } catch (err) {
      console.error("Failed to bulk assign:", err);
    }
  };

  const handleCellClick = (userId: string, date: Date) => {
    if (!isManager) return;
    setSelectedCell({ userId, date: date.toISOString() });
    const existing = getShiftForCell(userId, date);
    setSelectedShiftType(existing?.type || "");
    setAssignDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Planner</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManager ? "Manage weekly shifts for your team" : "View your shift schedule"}
          </p>
        </div>
        {isManager && (
          <>
            <Button
              onClick={() => setBulkDialogOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Assign Day
            </Button>
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Assign Shifts</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Day</Label>
                  <Select value={bulkDate} onValueChange={(v) => v && setBulkDate(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((d) => (
                        <SelectItem key={d.toISOString()} value={d.toISOString()}>
                          {formatDate(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shift Type</Label>
                  <Select value={bulkShiftType} onValueChange={(v) => v && setBulkShiftType(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select shift type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {SHIFT_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleBulkAssign}
                  disabled={!bulkDate || !bulkShiftType}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  Assign to All Employees
                  </Button>
              </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Week Navigation */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-orange-500" />
              Week {currentWeek.week}, {currentWeek.year}
              <span className="text-sm font-normal text-gray-500 ml-2">
                {formatDate(weekDays[0])} – {formatDate(weekDays[6])}
              </span>
            </CardTitle>
            <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-700 p-3 border-b border-gray-200 min-w-[140px]">
                      Employee
                    </th>
                    {weekDays.map((d) => (
                      <th
                        key={d.toISOString()}
                        className="text-center text-xs font-medium text-gray-500 p-2 border-b border-gray-200 min-w-[100px]"
                      >
                        <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                        <div className="text-gray-700 font-semibold">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const isCurrentUser = emp.id === session?.user?.id;
                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-gray-50 ${
                          isCurrentUser && !isManager ? "border-l-4 border-l-orange-500 bg-orange-50/30" : ""
                        }`}
                      >
                        <td className="p-3 border-b border-gray-100">
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.email.split("@")[0]}</div>
                        </td>
                        {weekDays.map((d) => {
                          const shift = getShiftForCell(emp.id, d);
                          const unavailable = isUnavailable(emp.id, d);
                          return (
                            <td
                              key={d.toISOString()}
                              className={`p-2 border-b border-gray-100 text-center ${
                                isManager ? "cursor-pointer hover:bg-orange-50/50" : ""
                              }`}
                              onClick={() => handleCellClick(emp.id, d)}
                            >
                              {unavailable && !shift && (
                                <span className="text-xs text-red-400 line-through">Unavailable</span>
                              )}
                              {shift && (
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${SHIFT_COLORS[shift.type]} ${
                                    unavailable ? "line-through opacity-70" : ""
                                  }`}
                                >
                                  {SHIFT_LABELS[shift.type]}
                                </Badge>
                              )}
                              {!shift && !unavailable && isManager && (
                                <span className="text-xs text-gray-300">+</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Legend */}
      <div className="flex flex-wrap gap-3">
        {SHIFT_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${SHIFT_COLORS[type]}`}>
              {SHIFT_LABELS[type]}
            </Badge>
          </div>
        ))}
      </div>

      {/* Assign Shift Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedCell && (
              <p className="text-sm text-gray-500">
                {employees.find((e) => e.id === selectedCell.userId)?.name} –{" "}
                {new Date(selectedCell.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
            <div>
              <Label>Shift Type</Label>
              <Select value={selectedShiftType} onValueChange={(v) => v && setSelectedShiftType(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select shift type" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SHIFT_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAssignShift}
              disabled={!selectedShiftType}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              Save Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
