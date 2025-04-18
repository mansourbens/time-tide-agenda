
import React, { useState, useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type EventCategory = "Work" | "Personal" | "Health" | "Other";
type Department = "HR" | "Engineering" | "Marketing" | "Sales";

interface AgendaEvent {
  id: number;
  title: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  category: EventCategory;
  department: Department;
  date: Date; // Add date to represent the specific day of week
}

const categories: { value: EventCategory; label: string; color: string }[] = [
  { value: "Work", label: "Work", color: "bg-purple-500" },
  { value: "Personal", label: "Personal", color: "bg-green-500" },
  { value: "Health", label: "Health", color: "bg-pink-500" },
  { value: "Other", label: "Other", color: "bg-gray-400" },
];

const departments: Department[] = ["HR", "Engineering", "Marketing", "Sales"];

const TIME_STEP = 15;
const DAY_START = 8 * 60; // 8:00 AM in minutes
const DAY_END = 20 * 60; // 8:00 PM in minutes

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string) {
  return !(timeToMinutes(e1) <= timeToMinutes(s2) || timeToMinutes(s1) >= timeToMinutes(e2));
}

const MAIN_COLOR = "#143a5a"; // dark blue
const SECONDARY_COLOR = "#FF422F"; // red

const Index = () => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<Department | "all">("all");
  const [openAdd, setOpenAdd] = useState(false);
  // Event form states
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:15");
  const [category, setCategory] = useState<EventCategory>("Work");
  const [department, setDepartment] = useState<Department>("Engineering");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // State for event detail dialog
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  // State for currently displayed week start for navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Generate time slots in 15 min increments from 8:00 to 20:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let m = DAY_START; m < DAY_END; m += TIME_STEP) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, []);

  // Calculate current week days (Sunday to Saturday)
  const daysOfWeek = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  // Filter events by department and week
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterDepartment !== "all" && e.department !== filterDepartment) {
        return false;
      }
      // Check event date in current week
      return daysOfWeek.some((d) => isSameDay(d, e.date));
    });
  }, [events, filterDepartment, daysOfWeek]);

  // Group events by day for quick placement
  const eventsByDay: Record<string, AgendaEvent[]> = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    daysOfWeek.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      map[key] = [];
    });
    filteredEvents.forEach((e) => {
      const key = format(e.date, "yyyy-MM-dd");
      if (map[key]) {
        map[key].push(e);
      }
    });
    return map;
  }, [filteredEvents, daysOfWeek]);

  // Check overlap for a new event (date + time)
  const hasOverlap = useMemo(() => {
    return events.some((e) => {
      if (format(e.date, "yyyy-MM-dd") !== date) return false;
      return timesOverlap(e.startTime, e.endTime, startTime, endTime);
    });
  }, [events, date, startTime, endTime]);

  // Add a new event
  const onAddEvent = () => {
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
      toast({ title: "Error", description: `Event times must be between 08:00 and 20:00`, variant: "destructive" });
      return;
    }
    if ((eMin - sMin) % TIME_STEP !== 0) {
      toast({ title: "Error", description: "Time step must be in 15 minute increments", variant: "destructive" });
      return;
    }

    setEvents((ev) => [
      ...ev,
      {
        id: Date.now(),
        title: title.trim(),
        startTime,
        endTime,
        category,
        department,
        date: new Date(date),
      },
    ]);
    setOpenAdd(false);
    setTitle("");
    setStartTime("08:00");
    setEndTime("08:15");
    setCategory("Work");
    setDepartment("Engineering");
    setDate(format(new Date(), "yyyy-MM-dd"));
    toast({ title: "Event added" });
  };

  // Constants for event display
  const EVENT_SLOT_HEIGHT = 36; // height per 15min slot to be compact

  // Updated daysOfWeek mapping with event columns using new colors and scroll container
  const eventColumns = daysOfWeek.map((d) => {
    const dayKey = format(d, "yyyy-MM-dd");
    const eventsForDay = eventsByDay[dayKey] || [];

    return (
      <div
        key={dayKey}
        className="relative border-r border-gray-300 min-w-0"
        style={{ minHeight: timeSlots.length * EVENT_SLOT_HEIGHT }}
      >
        {eventsForDay.map((ev) => {
          const startMinutes = timeToMinutes(ev.startTime);
          const endMinutes = timeToMinutes(ev.endTime);
          const top = ((startMinutes - DAY_START) / TIME_STEP) * EVENT_SLOT_HEIGHT;
          const height = ((endMinutes - startMinutes) / TIME_STEP) * EVENT_SLOT_HEIGHT;

          // Map categories to main and secondary colors: main for Work, secondary for Personal, else grey variants
          let bgColor = "bg-gray-400";
          let textColor = "text-white";
          switch (ev.category) {
            case "Work":
              bgColor = "bg-[#143a5a]";
              break;
            case "Personal":
              bgColor = "bg-[#FF422F]";
              break;
            case "Health":
              bgColor = "bg-pink-500";
              break;
            case "Other":
              bgColor = "bg-gray-400";
              textColor = "text-gray-900";
              break;
          }

          const overlap = eventsForDay.some(
            (other) =>
              other.id !== ev.id && timesOverlap(ev.startTime, ev.endTime, other.startTime, other.endTime)
          );

          return (
            <div
              key={ev.id}
              className={`${bgColor} absolute left-1 right-1 rounded-md p-1 text-xs overflow-hidden whitespace-nowrap cursor-pointer select-none ${textColor} shadow-md`}
              style={{
                top,
                height,
                border: overlap ? "2px solid #f87171" : "none",
                zIndex: overlap ? 10 : 1,
              }}
              title={`${ev.title} (${ev.startTime} - ${ev.endTime})\nCategory: ${ev.category}\nDepartment: ${ev.department}`}
              onClick={() => {
                setSelectedEvent(ev);
                setOpenDetail(true);
              }}
            >
              {ev.title}
            </div>
          );
        })}
      </div>
    );
  });

  // Adjust day header styling with main color for weekday labels, add better styling
  const dayHeaderElements = daysOfWeek.map((d) => (
    <div
      key={format(d, "yyyy-MM-dd")}
      className="border-b border-gray-300 border-r px-2 py-2 text-center font-semibold select-none shadow-sm"
      style={{ 
        color: "white", 
        backgroundColor: MAIN_COLOR,
        userSelect: "none",
      }}
    >
      {format(d, "EEE, MMM d")}
    </div>
  ));

  // Render time labels on left side in muted gray with fixed width
  const timeLabelElements = timeSlots.map((time) => (
    <div key={time} className="h-9 border-t border-gray-200 px-1 text-xs font-mono text-gray-500 select-none leading-[36px]">
      {time.endsWith("00") ? <strong>{time}</strong> : time}
    </div>
  ));

  // Navigation controls for weeks, months, years
  const navWeekBackward = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const navWeekForward = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const navMonthBackward = () => setCurrentWeekStart(subMonths(currentWeekStart, 1));
  const navMonthForward = () => setCurrentWeekStart(addMonths(currentWeekStart, 1));
  const navYearBackward = () => setCurrentWeekStart(subYears(currentWeekStart, 1));
  const navYearForward = () => setCurrentWeekStart(addYears(currentWeekStart, 1));

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4" style={{ color: MAIN_COLOR }}>
        Agenda Weekly Calendar
      </h1>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <Button variant="outline" onClick={navYearBackward} className="min-w-[3.5rem]">
          {"<<"}
        </Button>
        <Button variant="outline" onClick={navMonthBackward} className="min-w-[3.5rem]">
          {"<M"}
        </Button>
        <Button variant="outline" onClick={navWeekBackward} className="min-w-[3.5rem]">
          {"<W"}
        </Button>
        <div className="flex items-center font-medium px-4 text-lg select-none" style={{color: MAIN_COLOR}}>
          Week of {format(currentWeekStart, "MMM d, yyyy")}
        </div>
        <Button variant="outline" onClick={navWeekForward} className="min-w-[3.5rem]">
          {"W>"}
        </Button>
        <Button variant="outline" onClick={navMonthForward} className="min-w-[3.5rem]">
          {"M>"}
        </Button>
        <Button variant="outline" onClick={navYearForward} className="min-w-[3.5rem]">
          {">>"}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 w-full max-w-7xl px-2">
        {/* Department Filter Select */}
        <div className="flex-1">
          <Select value={filterDepartment} onValueChange={(value) => setFilterDepartment(value as Department | "all")}>
            <SelectTrigger className="w-full max-w-xs">
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
        {/* Add Event Dialog */}
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>Add Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" aria-describedby="add-event-desc">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <p id="add-event-desc" className="text-sm text-muted-foreground">Fill the details for the new event.</p>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddEvent();
              }}
              className="space-y-4 mt-2"
            >
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <Select
                    value={startTime}
                    onValueChange={(value) => {
                      setStartTime(value);
                      if (timeToMinutes(value) >= timeToMinutes(endTime)) {
                        const next = timeToMinutes(value) + TIME_STEP;
                        setEndTime(minutesToTime(Math.min(next, DAY_END)));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {timeSlots.slice(0, -1).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <Select
                    value={endTime}
                    onValueChange={(value) => {
                      if (timeToMinutes(value) <= timeToMinutes(startTime)) {
                        toast({ title: "Invalid End Time", description: "End time must be after start time", variant: "destructive" });
                      } else {
                        setEndTime(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {timeSlots.slice(1).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
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
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
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
                      <SelectItem key={dep} value={dep}>
                        {dep}
                      </SelectItem>
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
                <Button variant="outline" onClick={() => setOpenAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Event</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly calendar grid wrapped in horizontally centered and scrollable container */}
      <div
        className="border border-gray-300 rounded-md bg-white shadow-md w-full max-w-7xl overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 540 }}
      >
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
          {/* Top-left empty cell */}
          <div className="border-b border-r border-gray-300 bg-gray-50"></div>
          {/* Days headers */}
          {dayHeaderElements.map((el) => (
            <div key={el.key} className="border-b border-r border-gray-300">
              {el.props.children}
            </div>
          ))}
          {/* Time labels on the left */}
          <div className="flex flex-col border-r border-gray-300 bg-gray-50">
            {timeLabelElements}
          </div>
          {/* Day columns with events */}
          {eventColumns}
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-md" aria-describedby="event-detail-desc">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <p id="event-detail-desc" className="text-sm text-muted-foreground">
              Details of the selected event.
            </p>
          </DialogHeader>
          {selectedEvent ? (
            <div className="space-y-3">
              <div>
                <strong>Title:</strong> {selectedEvent.title}
              </div>
              <div>
                <strong>Date:</strong> {format(selectedEvent.date, "EEE, MMM d, yyyy")}
              </div>
              <div>
                <strong>Time:</strong> {selectedEvent.startTime} - {selectedEvent.endTime}
              </div>
              <div>
                <strong>Category:</strong> {selectedEvent.category}
              </div>
              <div>
                <strong>Department:</strong> {selectedEvent.department}
              </div>
            </div>
          ) : (
            <p>No event selected.</p>
          )}
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
