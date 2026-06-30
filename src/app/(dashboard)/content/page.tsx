"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Search, Clock } from "lucide-react";

type Employee = { id: string; name: string; email: string };
type Story = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignedTo: string | null;
  deadline: string | null;
  createdAt: string;
  assignee: Employee | null;
  creator: { id: string; name: string };
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "border-l-orange-500",
  IN_PROGRESS: "border-l-blue-500",
  AIRED: "border-l-green-500",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  AIRED: "Aired",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  PLANNED: "bg-orange-100 text-orange-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  AIRED: "bg-green-100 text-green-700",
};

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return "text-gray-400";
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff < 0) return "text-red-600 font-medium";
  if (diff < 24 * 60 * 60 * 1000) return "text-orange-600 font-medium";
  return "text-gray-500";
}

export default function ContentPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";

  const [stories, setStories] = useState<Story[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterAssignee !== "ALL") params.set("assignee", filterAssignee);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/stories?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (err) {
      console.error("Failed to fetch stories:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterAssignee, searchTerm]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts?week=2026-W01");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openCreateDialog = () => {
    setEditingStory(null);
    setFormTitle("");
    setFormDescription("");
    setFormAssignee("");
    setFormDeadline("");
    setFormOpen(true);
  };

  const openEditDialog = (story: Story) => {
    setEditingStory(story);
    setFormTitle(story.title);
    setFormDescription(story.description || "");
    setFormAssignee(story.assignedTo || "");
    setFormDeadline(story.deadline ? story.deadline.split("T")[0] : "");
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;

    const body = {
      title: formTitle,
      description: formDescription,
      assignedTo: formAssignee || null,
      deadline: formDeadline || null,
    };

    try {
      if (editingStory) {
        await fetch(`/api/stories/${editingStory.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setFormOpen(false);
      fetchStories();
    } catch (err) {
      console.error("Failed to save story:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/stories/${id}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      fetchStories();
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  const handleStatusChange = async (storyId: string, newStatus: string) => {
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchStories();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filteredStories = showOnlyMine
    ? stories.filter((s) => s.assignedTo === session?.user?.id)
    : stories;

  const planned = filteredStories.filter((s) => s.status === "PLANNED");
  const inProgress = filteredStories.filter((s) => s.status === "IN_PROGRESS");
  const aired = filteredStories.filter((s) => s.status === "AIRED");

  const renderStoryCard = (story: Story) => (
    <Card
      key={story.id}
      className={`bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 ${STATUS_COLORS[story.status]} rounded-lg`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{story.title}</h3>
          {isManager && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => openEditDialog(story)}
                className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteConfirmId(story.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {story.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{story.description}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {story.assignee && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                {story.assignee.name.split(" ")[0]}
              </span>
            )}
          </div>
          {story.deadline && (
            <div className={`flex items-center gap-1 text-xs ${getDeadlineColor(story.deadline)}`}>
              <Clock className="h-3 w-3" />
              {new Date(story.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        {/* Employee status update */}
        {!isManager && story.assignedTo === session?.user?.id && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Select
              value={story.status}
              onValueChange={(val) => val && handleStatusChange(story.id, val)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">Planned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="AIRED">Aired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderColumn = (title: string, items: Story[], status: string) => (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className={STATUS_BADGE_COLORS[status]}>
          {title}
        </Badge>
        <span className="text-xs text-gray-400">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map(renderStoryCard)
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">No stories</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Board</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage news stories</p>
        </div>
        {isManager && (
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search stories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PLANNED">Planned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="AIRED">Aired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={(v) => v && setFilterAssignee(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Assignees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isManager && (
              <Button
                variant={showOnlyMine ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyMine(!showOnlyMine)}
                className={showOnlyMine ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
              >
                My Stories
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4">
          {renderColumn("Planned", planned, "PLANNED")}
          {renderColumn("In Progress", inProgress, "IN_PROGRESS")}
          {renderColumn("Aired", aired, "AIRED")}
        </div>
      )}

      {/* Create/Edit Story Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStory ? "Edit Story" : "New Story"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Story title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description..."
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
              />
            </div>
            <div>
              <Label>Assignee</Label>
              <Select value={formAssignee} onValueChange={(v) => setFormAssignee(v ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!formTitle.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              {editingStory ? "Update Story" : "Create Story"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Story</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 py-4">
            Are you sure you want to delete this story? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
