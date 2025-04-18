import React, { useState, useMemo } from "react";
import { format, addMinutes, isBefore, isEqual, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type EventCategory = "Work" | "Personal" | "Health" | "Other";
type Department = "HR" | "Engineering" | "Marketing" | "Sales";

interface AgendaEvent {
  id: number;
  title: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  category: EventCategory;
  department: Department;
}

const categories: { value: EventCategory; label: string; color: string }[] = [
  { value: "Work", label: "Work", color: "bg-purple-500" },
  { value: "Personal", label: "Personal", color: "bg-green-500" },
  { value: "Health", label: "Health", color: "bg-pink-500" },
  { value: "Other", label: "Other", color: "bg-gray-400" },
];

const departments: Department[] = ["HR", "Engineering", "Marketing", "Sales"];

const TIME_STEP = 15;
const DAY_START = 0; // 00:00
const DAY_END = 24 * 60; // 1440 minutes

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${hh.toString().padStart(2,"0")}:${mm.toString().padStart(2,"0")}`;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string) {
  return !(timeToMinutes(e1) <= timeToMinutes(s2) || timeToMinutes(s1) >= timeToMinutes(e2));
}

const Index = () => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<Department | "all">("all");
  const [open, setOpen] = useState(false);

  // Event form states
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:15");
  const [category, setCategory] = useState<EventCategory>("Work");
  const [department, setDepartment] = useState<Department>("Engineering");

  // Generate time slots in 15 min increments
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let m = DAY_START; m < DAY_END; m += TIME_STEP) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, []);

  // Filter events by department if selected
  const displayedEvents = useMemo(() => {
    return filterDepartment === "all" ? events : events.filter(e => e.department === filterDepartment);
  }, [filterDepartment, events]);

  // Check for overlap warning for new event
  const hasOverlap = useMemo(() => {
    return events.some(e => timesOverlap(e.startTime, e.endTime, startTime, endTime));
  }, [events, startTime, endTime]);

  const onAddEvent = () => {
    // Validate fields
    if (!title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    const sMin = timeToMinutes(startTime);
    const eMin = timeToMinutes(endTime);
    if (eMin <= sMin) {
      toast({ title: "Error", description: "End time must be after start time", variant: "destructive" });
      return;
    }
    if (sMin < DAY_START || eMin > DAY_END) {
      toast({ title: "Error", description: "Event times must be within the day", variant: "destructive" });
      return;
    }
    if ((eMin - sMin) % TIME_STEP !== 0) {
      toast({ title: "Error", description: "Time step must be in 15 minute increments", variant: "destructive" });
      return;
    }

    // Add new event
    setEvents((ev) => [
      ...ev,
      {
        id: Date.now(),
        title: title.trim(),
        startTime,
        endTime,
        category,
        department,
      },
    ]);
    setOpen(false);
    setTitle("");
    setStartTime("08:00");
    setEndTime("08:15");
    setCategory("Work");
    setDepartment("Engineering");
    toast({ title: "Event added" });
  };

  // Render events as positioned blocks in the timeline
  const eventBlocks = displayedEvents.map((ev) => {
    const top = (timeToMinutes(ev.startTime) / DAY_END) * 96; // 96 = 24*4 (quarters) for relative positioning in grid rows
    const duration = (timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)) / TIME_STEP;
    const categoryColor = categories.find((c) => c.value === ev.category)?.color || "bg-gray-400";
    const overlap = events.some((other) =>
      other.id !== ev.id && timesOverlap(ev.startTime, ev.endTime, other.startTime, other.endTime)
    );

    return (
      <div
        key={ev.id}
        className={`${categoryColor} absolute left-20 right-4 rounded-md p-1 text-white text-xs overflow-hidden whitespace-nowrap`}
        style={{
          top: `${(timeToMinutes(ev.startTime) / DAY_END) * 100}%`,
          height: `${((timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)) / DAY_END) * 100}%`,
          border: overlap ? "2px solid #f87171" : "none",
          zIndex: overlap ? 10 : 1,
        }}
        title={`${ev.title} (${ev.startTime} - ${ev.endTime})\nCategory: ${ev.category}\nDepartment: ${ev.department}`}
      >
        {ev.title}
      </div>
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center text-purple-700">Agenda App</h1>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div>
          <Select value={filterDepartment} onValueChange={(value) => setFilterDepartment(value as Department | "all")} >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dep) => (
                <SelectItem key={dep} value={dep}>
                  {dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); onAddEvent(); }} className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                  placeholder="Event title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <Select value={startTime} onValueChange={(value) => {
                    setStartTime(value);
                    if (timeToMinutes(value) >= timeToMinutes(endTime)) {
                      const next = timeToMinutes(value) + TIME_STEP;
                      setEndTime(minutesToTime(Math.min(next, DAY_END)));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {timeSlots.slice(0, -1).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <Select value={endTime} onValueChange={(value) => {
                    if (timeToMinutes(value) <= timeToMinutes(startTime)) {
                      toast({ title: "Invalid End Time", description: "End time must be after start time", variant: "destructive" });
                    } else {
                      setEndTime(value);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {timeSlots.slice(1).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Select value={category} onValueChange={(value) => setCategory(value as EventCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <Select value={department} onValueChange={(value) => setDepartment(value as Department)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dep) => (
                      <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasOverlap && (
                <p className="text-sm text-red-600 font-semibold">
                  Warning: This event overlaps with an existing event.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Add Event</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative border border-gray-300 rounded-md bg-white h-[92vh] max-h-[600px] overflow-y-auto shadow-md">
        {/* Time labels */}
        <div className="sticky top-0 z-20 bg-white grid grid-cols-[60px_1fr] border-b border-gray-300 select-none">
          <div className="px-2 py-1 text-xs text-gray-500 font-mono border-r border-gray-300">Time</div>
          <div className="px-2 py-1 text-sm font-semibold text-gray-700">Events</div>
        </div>

        {/* Timeline container */}
        <div className="relative grid grid-cols-[60px_1fr] h-full" style={{ gridTemplateRows: `repeat(${timeSlots.length}, minmax(3rem, auto))` }}>
          {/* Time column */}
          <div className="border-r border-gray-300">
            {timeSlots.map((time) => (
              <div key={time} className="h-12 px-2 text-xs font-mono text-gray-500 select-none">
                {time.endsWith("00") ? <strong>{time}</strong> : time}
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="relative pl-2">
            {/* Render events */}
            {eventBlocks}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
